import { createGitgraph as createGitgraphCore } from "@gitgraph/js";

declare global {
    interface Window {
        GitgraphJS: {
            createGitgraph: typeof createGitgraphCore;
        };
        updateGitGraph: (local: string[], remote: string[], current: string) => void;
    }
}

window.updateGitGraph = function(local: string[], remote: string[], current: string) {
    const gitgraphElement = document.getElementById("gitgraph");
    if (!gitgraphElement) return;

    gitgraphElement.innerHTML = ''; // Clear previous graph
    const gitgraph = window.GitgraphJS.createGitgraph(gitgraphElement);

    const branches: { [key: string]: any } = {};
    const masterBranch = gitgraph.branch("master");
    branches["master"] = masterBranch;

    // Add local branches
    local.forEach(branchName => {
        if (branchName !== "master") {
            branches[branchName] = masterBranch.branch(branchName);
        }
    });

    // Add remote branches
    remote.forEach(branchName => {
        const localName = branchName.replace("origin/", "");
        if (!branches[localName]) {
            branches[localName] = masterBranch.branch(branchName);
        }
    });

    // Add some commits to each branch
    Object.keys(branches).forEach(branchName => {
        const branch = branches[branchName];
        branch.commit(`Commit on ${branchName}`);
        if (branchName === current) {
            branch.commit("HEAD").tag("HEAD");
        }
    });
};