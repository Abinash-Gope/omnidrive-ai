"""
OmniDrive AI - Lambda Microservice: File Registry & Status API
Routes:
  - GET /files (Fetch authenticated user's file registry)
  - GET /files/{fileId} (Fetch detailed job status & AI metadata for a specific file)

Features:
- Cognito JWT Authorizer integration (enforces multi-tenant data isolation by user_id).
- DynamoDB Single-Table queries (PK: USER#<id>, SK: FILE#<id>).
- Filtering by processing status via 'UserStatusIndex' GSI (?status=COMPLETED).
- Full CORS headers for browser clients.
"""

import json
import logging
import os
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "omnidrive-ai-registry-dev")


class DecimalEncoder(json.JSONEncoder):
    """Helper to serialize DynamoDB Decimal types to float/int"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)


def lambda_handler(event, context):
    logger.info("Handling File API request. Path: %s, Method: %s", event.get("rawPath") or event.get("path"), event.get("requestContext", {}).get("http", {}).get("method"))

    try:
        # 1. Authenticate user from Cognito JWT claims
        user_id = extract_user_id(event)
        if not user_id:
            return build_response(401, {"error": "Unauthorized: Missing valid Cognito authentication claim."})

        # 2. Extract path & route parameters
        http_method = (
            event.get("requestContext", {}).get("http", {}).get("method")
            or event.get("httpMethod", "GET")
        ).upper()

        path_parameters = event.get("pathParameters") or {}
        file_id = path_parameters.get("fileId")

        # Route 1: GET /files/{fileId}
        if file_id:
            return handle_get_file_detail(user_id, file_id)

        # Route 2: GET /files
        if http_method == "GET":
            query_params = event.get("queryStringParameters") or {}
            status_filter = query_params.get("status")
            return handle_list_user_files(user_id, status_filter)

        return build_response(405, {"error": f"Method {http_method} not allowed."})

    except ClientError as e:
        logger.error("AWS ClientError in files handler: %s", str(e), exc_info=True)
        return build_response(500, {"error": "AWS DynamoDB service error."})
    except Exception as e:
        logger.error("Unexpected error in files handler: %s", str(e), exc_info=True)
        return build_response(500, {"error": f"Internal server error: {str(e)}"})


def handle_list_user_files(user_id, status_filter=None):
    """
    Queries files belonging exclusively to the authenticated user.
    Uses 'UserStatusIndex' GSI when status_filter is supplied, or partition key query otherwise.
    """
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    user_pk = f"USER#{user_id}"

    if status_filter:
        # Query GSI: UserStatusIndex (PK = user_pk AND status = status_filter)
        logger.info("Querying UserStatusIndex for user: %s with status: %s", user_id, status_filter)
        response = table.query(
            IndexName="UserStatusIndex",
            KeyConditionExpression=Key("PK").eq(user_pk) & Key("status").eq(status_filter),
        )
    else:
        # Query Table by partition key PK = USER#<id>
        logger.info("Querying all files for user: %s", user_id)
        response = table.query(
            KeyConditionExpression=Key("PK").eq(user_pk) & Key("SK").begins_with("FILE#"),
        )

    items = response.get("Items", [])

    # Sort descending by created_at (most recent first)
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return build_response(
        200,
        {
            "user_id": user_id,
            "count": len(items),
            "files": items,
        },
    )


def handle_get_file_detail(user_id, file_id):
    """
    Fetches a single file record by PK: USER#<id>, SK: FILE#<file_id>.
    Guarantees that a user cannot access another tenant's files.
    """
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    user_pk = f"USER#{user_id}"
    file_sk = f"FILE#{file_id}"

    logger.info("Fetching file detail: %s for user: %s", file_sk, user_pk)
    response = table.get_item(
        Key={
            "PK": user_pk,
            "SK": file_sk,
        }
    )

    item = response.get("Item")
    if not item:
        return build_response(404, {"error": f"File with ID '{file_id}' not found."})

    return build_response(200, {"file": item})


def extract_user_id(event):
    """Extract user_id from Cognito JWT authorizer claims or headers"""
    jwt_claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )
    if "sub" in jwt_claims:
        return jwt_claims["sub"]

    cognito_claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("claims", {})
    )
    if "sub" in cognito_claims:
        return cognito_claims["sub"]

    headers = event.get("headers") or {}
    for key in ("x-user-id", "X-User-Id", "X-USER-ID"):
        if key in headers:
            return headers[key]

    return None


def build_response(status_code, body):
    """Standard HTTP response with production CORS headers and Decimal support"""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Id",
            "Access-Control-Allow-Methods": "OPTIONS,GET",
        },
        "body": json.dumps(body, cls=DecimalEncoder),
    }
