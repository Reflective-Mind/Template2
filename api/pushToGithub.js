export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        return response.status(500).json({ ok: false, error: 'Server configuration error: GITHUB_TOKEN missing' });
    }

    const { repo, branch, filePath, commitMessage, fileContent } = request.body;

    if (!repo || !filePath || !fileContent) {
        return response.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
        return response.status(400).json({ ok: false, error: 'Invalid repo format. Use owner/repo' });
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`;
    const targetBranch = branch || 'main';

    try {
        // 1. Get current SHA (if file exists)
        let sha = null;
        const getRes = await fetch(`${apiUrl}?ref=${targetBranch}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'MindVara-Engine'
            }
        });

        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        } else if (getRes.status !== 404) {
            const errText = await getRes.text();
            return response.status(getRes.status).json({ ok: false, error: `GitHub API Error (Read): ${errText}` });
        }

        // 2. Create/Update file
        const body = {
            message: commitMessage || 'Update via MindVara Engine',
            content: Buffer.from(fileContent).toString('base64'),
            branch: targetBranch
        };
        if (sha) body.sha = sha;

        const putRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'MindVara-Engine',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!putRes.ok) {
            const errText = await putRes.text();
            return response.status(putRes.status).json({ ok: false, error: `GitHub API Error (Write): ${errText}` });
        }

        const result = await putRes.json();
        return response.status(200).json({ ok: true, commitUrl: result.commit.html_url });

    } catch (e) {
        console.error(e);
        return response.status(500).json({ ok: false, error: e.message });
    }
}
