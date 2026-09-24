"""
Comprehensive Unit Tests for OmniDrive AI Lambda Microservices
Mocks AWS services (DynamoDB, S3, SQS, Rekognition, Textract, Bedrock) to test handler execution paths.
"""
import sys
import os
import json
import unittest
from unittest.mock import patch, MagicMock
import importlib.util

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Set required environment variables before imports
os.environ["RAW_BUCKET_NAME"] = "test-raw-bucket"
os.environ["PROCESSED_BUCKET_NAME"] = "test-processed-bucket"
os.environ["DYNAMODB_TABLE_NAME"] = "OmniDrive_Registry"
os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
os.environ["VISION_QUEUE_URL"] = "https://sqs.us-east-1.amazonaws.com/123/vision"
os.environ["PDF_QUEUE_URL"] = "https://sqs.us-east-1.amazonaws.com/123/pdf"
os.environ["VIDEO_QUEUE_URL"] = "https://sqs.us-east-1.amazonaws.com/123/video"

def load_module_from_file(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)
    return mod

# Load all 5 lambda modules with distinct namespace names
presigned_app = load_module_from_file("presigned_module", os.path.join(BASE_DIR, "lambda", "presigned_url", "app.py"))
files_app = load_module_from_file("files_module", os.path.join(BASE_DIR, "lambda", "files", "app.py"))
moderation_app = load_module_from_file("moderation_module", os.path.join(BASE_DIR, "lambda", "moderation_gate", "app.py"))
vision_app = load_module_from_file("vision_module", os.path.join(BASE_DIR, "lambda", "vision_ai", "app.py"))
pdf_app = load_module_from_file("pdf_module", os.path.join(BASE_DIR, "lambda", "pdf_summarizer", "app.py"))


class TestPresignedUrlLambda(unittest.TestCase):
    def test_missing_sub_returns_401(self):
        event = {
            "requestContext": {"authorizer": {"jwt": {"claims": {}}}},
            "body": json.dumps({"file_name": "test.jpg", "content_type": "image/jpeg", "file_size": 1024})
        }
        response = presigned_app.lambda_handler(event, None)
        self.assertEqual(response["statusCode"], 401)

    def test_successful_presigned_url_generation(self):
        mock_s3 = MagicMock()
        mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/presigned-url"
        presigned_app.s3_client = mock_s3

        mock_dynamo = MagicMock()
        mock_table = MagicMock()
        mock_dynamo.Table.return_value = mock_table
        presigned_app.dynamodb = mock_dynamo

        event = {
            "requestContext": {
                "authorizer": {
                    "jwt": {
                        "claims": {
                            "sub": "user-12345",
                            "email": "user@example.com"
                        }
                    }
                }
            },
            "body": json.dumps({
                "file_name": "vacation.png",
                "content_type": "image/png",
                "file_size": 2048000
            })
        }
        response = presigned_app.lambda_handler(event, None)
        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        self.assertIn("upload_url", body)
        self.assertIn("file_id", body)
        self.assertIn("s3_key", body)
        self.assertEqual(body["upload_url"], "https://s3.amazonaws.com/presigned-url")
        mock_table.put_item.assert_called_once()
        saved_item = mock_table.put_item.call_args[1]["Item"]
        self.assertEqual(saved_item["PK"], "USER#user-12345")
        self.assertEqual(saved_item["status"], "PENDING_UPLOAD")

    def test_s3_transfer_acceleration_client_config(self):
        """Verify that get_s3_client initializes with Transfer Acceleration enabled."""
        client_acc = presigned_app.get_s3_client(use_accelerate=True)
        self.assertTrue(client_acc.meta.config.s3.get("use_accelerate_endpoint"))

        client_std = presigned_app.get_s3_client(use_accelerate=False)
        self.assertFalse(client_std.meta.config.s3.get("use_accelerate_endpoint"))

    def test_s3_transfer_acceleration_presigned_url_format(self):
        """Verify that SigV4 presigned URL generated with accelerate endpoint targets s3-accelerate.amazonaws.com."""
        from botocore.config import Config
        import boto3

        acc_client = boto3.client(
            "s3",
            region_name="us-east-1",
            aws_access_key_id="mock_key",
            aws_secret_access_key="mock_secret",
            config=Config(s3={"use_accelerate_endpoint": True})
        )
        url = acc_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": "omnidrive-test-bucket",
                "Key": "raw/user-1/file-1/document.pdf",
                "ContentType": "application/pdf"
            },
            ExpiresIn=300
        )
        self.assertIn("omnidrive-test-bucket.s3-accelerate.amazonaws.com", url)
        self.assertIn("raw/user-1/file-1/document.pdf", url)

    def test_multipart_upload_lifecycle(self):
        """Verify initiate_multipart, part_url, and complete_multipart actions."""
        mock_s3 = MagicMock()
        mock_s3.create_multipart_upload.return_value = {"UploadId": "mp-test-upload-id"}
        mock_s3.generate_presigned_url.return_value = "https://s3-accelerate.amazonaws.com/part-1-url"
        mock_s3.complete_multipart_upload.return_value = {"Location": "s3://test-raw-bucket/raw/user-123/file-1/video.mp4"}
        presigned_app.s3_client = mock_s3

        mock_dynamo = MagicMock()
        mock_table = MagicMock()
        mock_dynamo.Table.return_value = mock_table
        presigned_app.dynamodb = mock_dynamo

        auth_event = {
            "requestContext": {
                "authorizer": {
                    "jwt": {"claims": {"sub": "user-mp-123"}}
                }
            }
        }

        # 1. Initiate Multipart
        init_event = dict(auth_event, body=json.dumps({
            "action": "initiate_multipart",
            "file_name": "heavy_asset.mp4",
            "file_type": "video/mp4",
            "file_size": 52428800
        }))
        init_res = presigned_app.lambda_handler(init_event, None)
        self.assertEqual(init_res["statusCode"], 200)
        init_body = json.loads(init_res["body"])
        self.assertEqual(init_body["upload_id"], "mp-test-upload-id")
        self.assertIn("raw/user-mp-123/", init_body["s3_key"])
        s3_key = init_body["s3_key"]
        file_id = init_body["file_id"]

        # 2. Get Part URL
        part_event = dict(auth_event, body=json.dumps({
            "action": "part_url",
            "file_key": s3_key,
            "upload_id": "mp-test-upload-id",
            "part_number": 1
        }))
        part_res = presigned_app.lambda_handler(part_event, None)
        self.assertEqual(part_res["statusCode"], 200)
        part_body = json.loads(part_res["body"])
        self.assertEqual(part_body["presigned_url"], "https://s3-accelerate.amazonaws.com/part-1-url")
        self.assertEqual(part_body["part_number"], 1)

        # 3. Complete Multipart
        comp_event = dict(auth_event, body=json.dumps({
            "action": "complete_multipart",
            "file_key": s3_key,
            "upload_id": "mp-test-upload-id",
            "file_id": file_id,
            "parts": [{"PartNumber": 1, "ETag": "test-etag-1"}]
        }))
        comp_res = presigned_app.lambda_handler(comp_event, None)
        self.assertEqual(comp_res["statusCode"], 200)
        comp_body = json.loads(comp_res["body"])
        self.assertEqual(comp_body["status"], "COMPLETED")
        self.assertEqual(comp_body["file_id"], file_id)
        mock_s3.complete_multipart_upload.assert_called_once()


class TestFilesApiLambda(unittest.TestCase):
    def test_missing_sub_returns_401(self):
        event = {
            "requestContext": {"authorizer": {"jwt": {"claims": {}}}},
            "httpMethod": "GET"
        }
        response = files_app.lambda_handler(event, None)
        self.assertEqual(response["statusCode"], 401)

    def test_list_files_success(self):
        mock_table = MagicMock()
        mock_table.query.return_value = {
            "Items": [
                {
                    "PK": "USER#user-12345",
                    "SK": "FILE#file-abc",
                    "file_id": "file-abc",
                    "file_name": "document.pdf",
                    "file_size": 512000,
                    "status": "COMPLETED",
                    "created_at": "2026-09-21T12:00:00Z"
                }
            ]
        }
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table
        files_app.dynamodb = mock_dynamo

        event = {
            "requestContext": {
                "authorizer": {
                    "jwt": {
                        "claims": {"sub": "user-12345"}
                    }
                },
                "http": {
                    "method": "GET"
                }
            },
            "queryStringParameters": None
        }
        response = files_app.lambda_handler(event, None)
        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        self.assertEqual(body["count"], 1)
        self.assertEqual(body["files"][0]["file_id"], "file-abc")

    def test_cloudfront_url_enrichment(self):
        """Verify that files_api generates CloudFront URLs when CLOUDFRONT_DOMAIN is set."""
        mock_table = MagicMock()
        mock_table.query.return_value = {
            "Items": [
                {
                    "PK": "USER#user-cdn",
                    "SK": "FILE#file-video-99",
                    "file_id": "file-video-99",
                    "file_name": "presentation.mp4",
                    "content_type": "video/mp4",
                    "status": "COMPLETED",
                    "hls_master_url": "s3://test-processed-bucket/hls/file-video-99/master.m3u8",
                    "thumbnail_s3_key": "processed/thumbnails/file-video-99.webp"
                }
            ]
        }
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table
        files_app.dynamodb = mock_dynamo

        with patch.dict(os.environ, {"CLOUDFRONT_DOMAIN": "cdn.omnidrive.ai"}):
            files_app.CLOUDFRONT_DOMAIN = "cdn.omnidrive.ai"
            event = {
                "requestContext": {
                    "authorizer": {
                        "jwt": {"claims": {"sub": "user-cdn"}}
                    }
                },
                "httpMethod": "GET"
            }
            response = files_app.lambda_handler(event, None)
            self.assertEqual(response["statusCode"], 200)
            body = json.loads(response["body"])
            item = body["files"][0]
            self.assertEqual(item["hlsUrl"], "https://cdn.omnidrive.ai/hls/file-video-99/master.m3u8")
            self.assertEqual(item["thumbnailUrl"], "https://cdn.omnidrive.ai/thumbnails/file-video-99.webp")


class TestModerationGateLambda(unittest.TestCase):
    def test_moderation_rejection_deletes_s3_and_updates_dynamo(self):
        mock_rekognition = MagicMock()
        mock_rekognition.detect_moderation_labels.return_value = {
            "ModerationLabels": [{"Name": "Explicit Nudity", "Confidence": 98.5}]
        }
        mock_s3 = MagicMock()
        mock_s3.head_object.return_value = {"ContentType": "image/jpeg", "ContentLength": 5000}

        mock_dynamo = MagicMock()
        mock_table = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        mock_sqs = MagicMock()

        moderation_app.rekognition = mock_rekognition
        moderation_app.s3 = mock_s3
        moderation_app.dynamodb = mock_dynamo
        moderation_app.sqs = mock_sqs

        sqs_event = {
            "Records": [
                {
                    "body": json.dumps({
                        "detail": {
                            "bucket": {"name": "test-raw-bucket"},
                            "object": {"key": "raw/user-12345/file-999/bad_image.jpg"}
                        }
                    })
                }
            ]
        }

        response = moderation_app.lambda_handler(sqs_event, None)
        self.assertEqual(response["statusCode"], 200)
        mock_s3.delete_object.assert_called_once_with(
            Bucket="test-raw-bucket",
            Key="raw/user-12345/file-999/bad_image.jpg"
        )
        self.assertGreaterEqual(mock_table.update_item.call_count, 1)
        last_update_call = mock_table.update_item.call_args[1]
        self.assertEqual(last_update_call["Key"], {"PK": "USER#user-12345", "SK": "FILE#file-999"})
        self.assertEqual(last_update_call["ExpressionAttributeValues"][":status"], "REJECTED_SAFETY_VIOLATION")

    def test_safe_image_routes_to_vision_queue(self):
        mock_rekognition = MagicMock()
        mock_rekognition.detect_moderation_labels.return_value = {"ModerationLabels": []}
        mock_s3 = MagicMock()
        mock_s3.head_object.return_value = {"ContentType": "image/jpeg", "ContentLength": 5000}

        mock_dynamo = MagicMock()
        mock_table = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        mock_sqs = MagicMock()

        moderation_app.rekognition = mock_rekognition
        moderation_app.s3 = mock_s3
        moderation_app.dynamodb = mock_dynamo
        moderation_app.sqs = mock_sqs

        sqs_event = {
            "Records": [
                {
                    "body": json.dumps({
                        "detail": {
                            "bucket": {"name": "test-raw-bucket"},
                            "object": {"key": "raw/user-12345/file-safe/flower.jpg"}
                        }
                    })
                }
            ]
        }

        response = moderation_app.lambda_handler(sqs_event, None)
        self.assertEqual(response["statusCode"], 200)
        mock_sqs.send_message.assert_called_once()
        sent_body = json.loads(mock_sqs.send_message.call_args[1]["MessageBody"])
        self.assertEqual(sent_body["content_type"], "image/jpeg")
        self.assertEqual(sent_body["file_id"], "file-safe")


class TestVisionAiLambda(unittest.TestCase):
    def test_vision_ai_detects_labels_and_completes(self):
        mock_rekognition = MagicMock()
        mock_rekognition.detect_labels.return_value = {
            "Labels": [
                {"Name": "Landscape", "Confidence": 99.1},
                {"Name": "Mountain", "Confidence": 94.3}
            ]
        }
        mock_s3 = MagicMock()
        from io import BytesIO
        from PIL import Image
        img_byte_arr = BytesIO()
        Image.new('RGB', (100, 200)).save(img_byte_arr, format='PNG')
        mock_s3.get_object.return_value = {"Body": BytesIO(img_byte_arr.getvalue())}

        mock_dynamo = MagicMock()
        mock_table = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        vision_app.rekognition = mock_rekognition
        vision_app.s3 = mock_s3
        vision_app.dynamodb = mock_dynamo

        sqs_event = {
            "Records": [
                {
                    "body": json.dumps({
                        "file_id": "file-pic-1",
                        "user_id": "user-123",
                        "bucket": "test-raw-bucket",
                        "key": "raw/user-123/file-pic-1/scenery.png",
                        "content_type": "image/png"
                    })
                }
            ]
        }

        response = vision_app.lambda_handler(sqs_event, None)
        self.assertEqual(response["statusCode"], 200)
        self.assertGreaterEqual(mock_table.update_item.call_count, 1)
        last_call_vals = mock_table.update_item.call_args[1]["ExpressionAttributeValues"]
        self.assertEqual(last_call_vals[":status"], "COMPLETED")
        self.assertTrue(any(l["name"] == "Landscape" for l in last_call_vals[":labels"]))


class TestPdfSummarizerLambda(unittest.TestCase):
    def test_pdf_summarizer_extracts_text_and_summarizes(self):
        mock_textract = MagicMock()
        mock_textract.detect_document_text.return_value = {
            "Blocks": [
                {"BlockType": "LINE", "Text": "OmniDrive AI Quarterly Financial Report 2026."},
                {"BlockType": "LINE", "Text": "Revenue increased by 140% driven by serverless architecture."}
            ]
        }

        mock_bedrock = MagicMock()
        from io import BytesIO
        bedrock_response_body = json.dumps({
            "content": [
                {"text": "Executive Summary: OmniDrive AI posted 140% revenue growth powered by serverless infrastructure."}
            ]
        })
        mock_bedrock.invoke_model.return_value = {
            "body": BytesIO(bedrock_response_body.encode("utf-8"))
        }

        mock_dynamo = MagicMock()
        mock_table = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        pdf_app.textract = mock_textract
        pdf_app.bedrock_runtime = mock_bedrock
        pdf_app.dynamodb = mock_dynamo

        sqs_event = {
            "Records": [
                {
                    "body": json.dumps({
                        "file_id": "file-report-42",
                        "user_id": "user-corp",
                        "bucket": "test-raw-bucket",
                        "key": "raw/user-corp/file-report-42/quarterly_report.pdf",
                        "content_type": "application/pdf"
                    })
                }
            ]
        }

        response = pdf_app.lambda_handler(sqs_event, None)
        self.assertEqual(response["statusCode"], 200)
        self.assertGreaterEqual(mock_table.update_item.call_count, 1)
        last_call_vals = mock_table.update_item.call_args[1]["ExpressionAttributeValues"]
        self.assertEqual(last_call_vals[":status"], "COMPLETED")
        self.assertIn("Executive Summary", last_call_vals[":sum"])


class TestVideoTranscoderWorker(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.transcoder_mod = load_module_from_file(
            "transcoder_module",
            os.path.join(BASE_DIR, "workers", "video_transcoder", "transcoder.py")
        )

    @patch("subprocess.run")
    @patch("shutil.rmtree")
    def test_transcoder_executes_and_updates_dynamo(self, mock_rmtree, mock_subprocess):
        mock_res = MagicMock()
        mock_res.returncode = 0
        mock_subprocess.return_value = mock_res

        mock_sqs = MagicMock()
        mock_sqs.receive_message.return_value = {
            "Messages": [
                {
                    "ReceiptHandle": "test-receipt-token",
                    "Body": json.dumps({
                        "file_id": "vid-101",
                        "user_id": "user-director",
                        "bucket": "test-raw-bucket",
                        "key": "raw/user-director/vid-101/nature_4k.mp4"
                    })
                }
            ]
        }
        mock_s3 = MagicMock()
        mock_table = MagicMock()
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        self.transcoder_mod.sqs = mock_sqs
        self.transcoder_mod.s3 = mock_s3
        self.transcoder_mod.dynamodb = mock_dynamo
        self.transcoder_mod.VIDEO_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123/video"

        self.transcoder_mod.main()

        # Check S3 download was called
        mock_s3.download_file.assert_called_once()
        # Check DynamoDB was updated to COMPLETED with HLS url
        self.assertGreaterEqual(mock_table.update_item.call_count, 2)
        last_call = mock_table.update_item.call_args[1]
        self.assertEqual(last_call["Key"], {"PK": "USER#user-director", "SK": "FILE#vid-101"})
        self.assertEqual(last_call["ExpressionAttributeValues"][":status"], "COMPLETED")
        self.assertIn(":hls_master_url", last_call["ExpressionAttributeValues"])
        # Check SQS message deleted
        mock_sqs.delete_message.assert_called_once()

    def test_transcoder_6_tier_qualities_ladder(self):
        """Verify that transcoder defines 6-tier ladder down to 240p with Original source quality."""
        qualities = [q["name"] for q in self.transcoder_mod.HLS_QUALITIES]
        self.assertEqual(qualities, ["Original", "1080p", "720p", "480p", "360p", "240p"])
        # Verify 240p has 200k video bitrate for 3G cellular stability
        q_240p = next(q for q in self.transcoder_mod.HLS_QUALITIES if q["name"] == "240p")
        self.assertEqual(q_240p["video_bitrate"], "200k")
        # Verify Original has no scaling limit
        q_orig = next(q for q in self.transcoder_mod.HLS_QUALITIES if q["name"] == "Original")
        self.assertIsNone(q_orig["resolution"])


if __name__ == "__main__":
    unittest.main()

