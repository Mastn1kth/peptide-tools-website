from fastapi.testclient import TestClient
from starlette.responses import PlainTextResponse

from app.body_limit import BodySizeLimitMiddleware
from app.main import app


client = TestClient(app)


def test_health_reports_pinned_upstream_commit():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert len(body["upstream_commit"]) == 40


def test_empty_input_is_rejected_before_calculation():
    response = client.post("/submitJob", json={"input": "   "})
    assert response.status_code == 422


def test_upload_rejects_unsupported_extensions():
    response = client.post(
        "/upload", files={"uploads[]": ("payload.txt", b"ADWAK", "text/plain")}
    )
    assert response.status_code == 415


def test_real_fasta_calculation_returns_chart():
    response = client.post("/submitJob", json={"input": "ADWAK"})
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["output_descriptors"]["1"]["seq_length"] == 5
    assert round(result["output_descriptors"]["1"]["molecular_weight"], 1) == 589.6
    assert round(result["output_pIChemiSt"]["1"]["pI"]["pI mean"], 1) == 9.2

    chart = client.get(f"/image/{result['filename']}")
    assert chart.status_code == 200
    assert chart.headers["content-type"] == "image/png"
    assert len(chart.content) > 10_000


def test_fasta_upload_can_be_calculated():
    uploaded = client.post(
        "/upload",
        files={"uploads[]": ("payload.fasta", b">example\nADWAK\n", "text/plain")},
    )
    assert uploaded.status_code == 200
    token = uploaded.json()[0]["filename"]

    response = client.post("/submitJob", json={"input": token, "input_type": "file"})
    assert response.status_code == 200
    assert response.json()["result"]["output_descriptors"]["1"]["seq_length"] == 5


def test_real_smiles_calculation_matches_reference_example():
    smiles = (
        "C[C@@H](C(=O)N[C@@H](CCC(=O)O)C(=O)O)NC(=O)[C@H](C(C)C)NC(=O)"
        "[C@H](Cc1ccc(cc1)O)NC(=O)[C@@H]2CCCN2C(=O)[C@H](Cc3ccccc3)N"
    )
    response = client.post("/submitJob", json={"input": smiles})
    assert response.status_code == 200
    descriptors = response.json()["result"]["output_descriptors"]["1"]
    assert descriptors["seq_length"] == 6
    assert round(descriptors["molecular_weight"], 1) == 724.8


def test_invalid_input_does_not_expose_traceback():
    response = client.post("/submitJob", json={"input": "not-a-valid-structure-123"})
    assert response.status_code == 422
    body = response.text.lower()
    assert "traceback" not in body
    assert "site-packages" not in body


def test_explicit_smiles_is_not_misread_as_fasta():
    response = client.post(
        "/submitJob", json={"input": "CCN", "input_type": "smiles"}
    )
    assert response.status_code == 200
    descriptors = response.json()["result"]["output_descriptors"]["1"]
    assert round(descriptors["molecular_weight"], 1) == 45.1


def test_pasted_fasta_header_is_detected_in_auto_mode():
    response = client.post("/submitJob", json={"input": ">example\nADWAK\n"})
    assert response.status_code == 200
    descriptors = response.json()["result"]["output_descriptors"]["1"]
    assert descriptors["seq_length"] == 5


def test_local_server_path_is_never_accepted_as_input():
    response = client.post(
        "/submitJob",
        json={"input": "backend/tests/test_api.py", "input_type": "file"},
    )
    assert response.status_code == 422
    assert "invalid or expired" in response.text


def test_oversized_fasta_is_rejected_without_crashing_service():
    response = client.post(
        "/submitJob", json={"input": "A" * 1000, "input_type": "fasta"}
    )
    assert response.status_code == 422
    assert "limited to 200 residues" in response.text
    assert client.get("/health").status_code == 200


def test_content_length_limit_rejects_before_body_parsing():
    response = client.post(
        "/submitJob",
        content=b"{}",
        headers={"Content-Type": "application/json", "Content-Length": "999999"},
    )
    assert response.status_code == 413


def test_chunked_body_limit_counts_received_bytes():
    async def endpoint(scope, receive, send):
        while True:
            message = await receive()
            if message["type"] == "http.request" and not message.get("more_body"):
                break
        await PlainTextResponse("ok")(scope, receive, send)

    limited_app = BodySizeLimitMiddleware(endpoint, {"/limited": 4})
    messages = iter(
        [
            {"type": "http.request", "body": b"abc", "more_body": True},
            {"type": "http.request", "body": b"def", "more_body": False},
        ]
    )
    sent = []

    async def receive():
        return next(messages)

    async def send(message):
        sent.append(message)

    import asyncio

    asyncio.run(
        limited_app(
            {"type": "http", "path": "/limited", "headers": []}, receive, send
        )
    )
    assert sent[0]["status"] == 413
