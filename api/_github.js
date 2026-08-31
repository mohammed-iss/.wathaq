// Shared GitHub REST API logic, used by both api/github-connector.js (Vercel
// serverless, production) and the Vite dev middleware in vite.config.js (local dev)
// -- same pattern as api/_gemini.js and api/_evidenceExtraction.js, so dev and prod
// behavior can't drift apart.

async function gh(path, token) {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "wathaq-evidence-connector",
    },
  });
}

export async function checkGithubRepo({ token, owner, repo }) {
  if (!token || !owner || !repo) {
    const err = new Error("token, owner, and repo are all required");
    err.status = 400;
    throw err;
  }

  const userRes = await gh("/user", token);
  if (userRes.status === 401) {
    const err = new Error("Token is invalid or expired");
    err.status = 401;
    throw err;
  }
  if (!userRes.ok) {
    const err = new Error(`GitHub API error verifying token (${userRes.status})`);
    err.status = userRes.status;
    throw err;
  }
  const user = await userRes.json();

  const repoRes = await gh(`/repos/${owner}/${repo}`, token);
  if (repoRes.status === 404) {
    const err = new Error(`Repository ${owner}/${repo} not found, or the token can't see it`);
    err.status = 404;
    throw err;
  }
  if (!repoRes.ok) {
    const err = new Error(`GitHub API error reading repo (${repoRes.status})`);
    err.status = repoRes.status;
    throw err;
  }
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch;

  const protectionRes = await gh(`/repos/${owner}/${repo}/branches/${defaultBranch}/protection`, token);
  let branchProtection;
  if (protectionRes.status === 404) {
    branchProtection = { enabled: false, detail: `"${defaultBranch}" has no branch protection rule` };
  } else if (protectionRes.ok) {
    const p = await protectionRes.json();
    branchProtection = {
      enabled: true,
      detail: [
        p.required_pull_request_reviews ? "requires PR review" : null,
        p.required_status_checks ? "requires status checks" : null,
        p.enforce_admins?.enabled ? "enforced for admins" : null,
      ].filter(Boolean).join(", ") || "protected, no specific rules read",
    };
  } else {
    branchProtection = { enabled: null, detail: `Token lacks permission to read this (${protectionRes.status})` };
  }

  const dependabotRes = await gh(`/repos/${owner}/${repo}/vulnerability-alerts`, token);
  let dependabot;
  if (dependabotRes.status === 204) dependabot = { enabled: true, detail: "Dependabot alerts are enabled" };
  else if (dependabotRes.status === 404) dependabot = { enabled: false, detail: "Dependabot alerts are disabled" };
  else dependabot = { enabled: null, detail: `Token lacks permission to read this (${dependabotRes.status})` };

  return {
    connectedAs: user.login,
    repo: `${repoData.owner.login}/${repoData.name}`,
    visibility: repoData.private ? "private" : "public",
    defaultBranch,
    checks: [
      { name: "Branch protection", ...branchProtection },
      { name: "Dependabot alerts", ...dependabot },
    ],
    checkedAt: new Date().toISOString(),
  };
}
