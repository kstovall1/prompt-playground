"""Tests for the /api/config endpoint."""

import os

import pytest


@pytest.fixture
def client():
    """FastAPI test client with a clean environment."""
    from fastapi.testclient import TestClient
    from server.routes.config import router
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_config_returns_defaults(client, monkeypatch):
    monkeypatch.delenv("PROMPT_CATALOG", raising=False)
    monkeypatch.delenv("PROMPT_SCHEMA", raising=False)
    monkeypatch.delenv("EVAL_SCHEMA", raising=False)
    monkeypatch.delenv("SQL_WAREHOUSE_ID", raising=False)

    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert data["prompt_catalog"] == ""
    assert data["prompt_schema"] == "prompts"
    assert data["eval_catalog"] == ""
    assert data["eval_schema"] == "eval_data"
    assert data["sql_warehouse_id"] == ""


def test_config_reads_env_vars(client, monkeypatch):
    monkeypatch.setenv("PROMPT_CATALOG", "my_catalog")
    monkeypatch.setenv("PROMPT_SCHEMA", "my_prompts")
    monkeypatch.setenv("EVAL_SCHEMA", "my_eval")

    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert data["prompt_catalog"] == "my_catalog"
    assert data["prompt_schema"] == "my_prompts"
    assert data["eval_catalog"] == "my_catalog"   # same catalog as prompt
    assert data["eval_schema"] == "my_eval"


def test_eval_catalog_matches_prompt_catalog(client, monkeypatch):
    monkeypatch.setenv("PROMPT_CATALOG", "shared_catalog")
    monkeypatch.delenv("PROMPT_SCHEMA", raising=False)
    monkeypatch.delenv("EVAL_SCHEMA", raising=False)

    response = client.get("/api/config")
    data = response.json()
    assert data["eval_catalog"] == data["prompt_catalog"] == "shared_catalog"


def test_config_response_has_required_keys(client, monkeypatch):
    monkeypatch.delenv("PROMPT_CATALOG", raising=False)
    monkeypatch.delenv("PROMPT_SCHEMA", raising=False)
    monkeypatch.delenv("EVAL_SCHEMA", raising=False)

    response = client.get("/api/config")
    data = response.json()
    assert set(data.keys()) == {"prompt_catalog", "prompt_schema", "eval_catalog", "eval_schema", "mlflow_experiment_name", "sql_warehouse_id"}
