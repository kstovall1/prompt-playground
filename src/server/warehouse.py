"""SQL Warehouse client for reading Unity Catalog eval datasets."""

import time
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState
from server.config import get_workspace_client


def _get_client() -> WorkspaceClient:
    return get_workspace_client()


def list_eval_tables(catalog: str, schema: str, warehouse_id: str) -> list[dict]:
    """List tables in a given catalog.schema."""
    w = _get_client()
    resp = w.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=f"SHOW TABLES IN `{catalog}`.`{schema}`",
        wait_timeout="30s",
    )
    if resp.status.state != StatementState.SUCCEEDED:
        raise RuntimeError(f"SHOW TABLES failed: {resp.status.error}")

    tables = []
    if resp.result and resp.result.data_array:
        for row in resp.result.data_array:
            tables.append({"catalog": catalog, "schema": schema, "name": row[1]})
    return tables


def get_table_columns(catalog: str, schema: str, table: str, warehouse_id: str) -> list[str]:
    """Return column names for a UC table."""
    w = _get_client()
    resp = w.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=f"DESCRIBE TABLE `{catalog}`.`{schema}`.`{table}`",
        wait_timeout="30s",
    )
    if resp.status.state != StatementState.SUCCEEDED:
        raise RuntimeError(f"DESCRIBE failed: {resp.status.error}")

    cols = []
    if resp.result and resp.result.data_array:
        for row in resp.result.data_array:
            col_name = row[0]
            if col_name and not col_name.startswith("#"):
                cols.append(col_name)
    return cols


def count_table_rows(catalog: str, schema: str, table: str, warehouse_id: str) -> int:
    """Return the total row count for a UC table."""
    w = _get_client()
    resp = w.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=f"SELECT COUNT(*) FROM `{catalog}`.`{schema}`.`{table}`",
        wait_timeout="30s",
    )
    if resp.status.state != StatementState.SUCCEEDED:
        raise RuntimeError(f"COUNT failed: {resp.status.error}")
    if resp.result and resp.result.data_array:
        return int(resp.result.data_array[0][0])
    return 0


def read_table_rows(catalog: str, schema: str, table: str, warehouse_id: str, limit: int = 50) -> list[dict]:
    """Read rows from a UC table as list of dicts."""
    w = _get_client()
    resp = w.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=f"SELECT * FROM `{catalog}`.`{schema}`.`{table}` LIMIT {limit}",
        wait_timeout="50s",
    )
    if resp.status.state != StatementState.SUCCEEDED:
        raise RuntimeError(f"SELECT failed: {resp.status.error}")

    if not resp.result or not resp.result.data_array:
        return []

    col_names = [c.name for c in resp.manifest.schema.columns]
    rows = []
    for row in resp.result.data_array:
        rows.append(dict(zip(col_names, row)))
    return rows
