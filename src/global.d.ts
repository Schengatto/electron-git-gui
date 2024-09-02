export {};

interface CommitLogs {
  date: string;
  message: string;
  hash: string;
  autor: string;
}

declare global {
  interface Window {
    electronAPI: {
      openDirectory: () => Promise<string | undefined>;
      initGit: (dir: string) => Promise<boolean>;
      fetchAndGetBranches: () => Promise<{
        local: string[];
        remote: string[];
        current: string | null;
      }>;
      switchBranch: (branchName: string) => Promise<boolean>;
      getStatus: () => Promise<{
        staged: string[];
        modified: string[];
        created: string[];
        deleted: string[];
        renamed: { from: string; to: string }[];
        conflicted: string[];
      } | null>;
      stageFile: (file: string) => Promise<boolean>;
      unstageFile: (file: string) => Promise<boolean>;
      stageAllFiles: () => Promise<boolean>;
      unstageAllFiles: () => Promise<boolean>;
      commit: (message: string) => Promise<boolean>;
      push: (force: boolean) => Promise<boolean>;
      hasCommitsToPush: () => Promise<boolean>;
      getCommitHistory: (days: number) => Promise<CommitLogs[]>;
      getGitTree: (maxCount: number) => Promise<string>;
    };
    updateGitGraph: (local: string[], remote: string[], current: string) => void;
  }
}