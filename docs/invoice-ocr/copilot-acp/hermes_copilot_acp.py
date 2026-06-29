"""hermes_copilot_acp.py — Copilot ACP (Agent Client Protocol) client for Hermes.

Lets the Hermes orchestrator call a GitHub Copilot ACP server for code
suggestions, PR review, and issue auto-fix. The ACP base URL is read from the
COPILOT_ACP_BASE environment variable (no hard-coded hosts/credentials).
"""
import os
import httpx

ACP_BASE = os.environ.get("COPILOT_ACP_BASE", "http://localhost:9090")


async def copilot_suggest(prompt: str, context: dict) -> str:
    """Send a prompt to Copilot ACP and return the suggestion text."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ACP_BASE}/v1/completions",
            json={"prompt": prompt, "context": context, "max_tokens": 2000},
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["text"]


async def copilot_review_pr(repo: str, pr_number: int) -> dict:
    """Request a Copilot ACP review of a pull request."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ACP_BASE}/v1/review",
            json={"repository": repo, "pull_request": pr_number},
        )
        resp.raise_for_status()
        return resp.json()


async def copilot_fix_issue(repo: str, issue_number: int) -> dict:
    """Ask Copilot ACP to auto-fix an issue and open a PR."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ACP_BASE}/v1/fix",
            json={"repository": repo, "issue": issue_number, "auto_pr": True},
        )
        resp.raise_for_status()
        return resp.json()
