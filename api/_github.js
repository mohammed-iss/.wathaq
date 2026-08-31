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

// GitHub's modern Rulesets (repo Settings -> Rules -> Rulesets) don't show up via
// the classic /branches/{branch}/protection endpoint at all -- they're a fully
// separate system. This checks for an active branch ruleset that actually targets
// the given branch, so a repo protected only via a ruleset isn't misreported as unprotected.
async function checkRulesetProtection(owner, repo, branch, token) {
  const listRes = await gh(`/repos/${owner}/${repo}/rulesets`, token);
  if (!listRes.ok) {
    return { enabled: false, detail: `"${branch}" has no branch protection rule` };
  }
  const rulesets = await listRes.json();
  const activeBranchRulesets = rulesets.filter((r) => r.target === "branch" && r.enforcement === "active");
  if (activeBranchRulesets.length === 0) {
    return { enabled: false, detail: `"${branch}" has no branch protection rule` };
  }

  for (const summary of activeBranchRulesets) {
    const detailRes = await gh(`/repos/${owner}/${repo}/rulesets/${summary.id}`, token);
    if (!detailRes.ok) continue;
    const rs = await detailRes.json();
    const include = rs.conditions?.ref_name?.include || [];
    const exclude = rs.conditions?.ref_name?.exclude || [];
    const targetsBranch = include.some((p) => p === "~ALL" || p === "~DEFAULT_BRANCH" || p === `refs/heads/${branch}`);
    const excluded = exclude.includes(`refs/heads/${branch}`);
    if (targetsBranch && !excluded) {
      const ruleTypes = (rs.rules || []).map((r) => r.type);
      const readable = {
        pull_request: "requires PR review", non_fast_forward: "blocks force pushes",
        deletion: "blocks deletion", required_signatures: "requires signed commits",
        required_status_checks: "requires status checks",
      };
      const detail = ruleTypes.map((t) => readable[t]).filter(Boolean).join(", ") || "protected via ruleset";
      return { enabled: true, detail: `${detail} (ruleset: ${rs.name})` };
    }
  }
  return { enabled: false, detail: `"${branch}" has no branch protection rule` };
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
    // Classic branch protection sees nothing -- GitHub's newer Rulesets system is a
    // separate mechanism with its own API, so a real "no classic protection" repo
    // may still be protected via an active ruleset. Check that before calling it unprotected.
    branchProtection = await checkRulesetProtection(owner, repo, defaultBranch, token);
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
