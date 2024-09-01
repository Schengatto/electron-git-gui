

document.addEventListener('DOMContentLoaded', () => {
    const pageContainerElement = document.getElementById('pageContainer') as HTMLButtonElement;
    const stageAllButton = document.getElementById('stageAllFiles') as HTMLButtonElement | null;
    const unstageAllButton = document.getElementById('unstageAllFiles') as HTMLButtonElement | null;
    const stagedFilesList = document.getElementById('stagedFiles') as HTMLUListElement | null;
    const unstagedFilesList = document.getElementById('unstagedFiles') as HTMLUListElement | null;
    const errorMessageElement = document.getElementById('errorMessage') as HTMLDivElement | null;
    const commitForm = document.getElementById('commitForm') as HTMLFormElement | null;
    const commitMessageInput = document.getElementById('commitMessage') as HTMLInputElement | null;
    const pushButton = document.getElementById('pushButton') as HTMLButtonElement | null;
    const forcePushCheckbox = document.getElementById('forcePushCheckbox') as HTMLInputElement | null;
    const pushSection = document.getElementById('pushSection') as HTMLDivElement | null;


    if (!stageAllButton || !unstageAllButton || !stagedFilesList || !unstagedFilesList || !pushSection ||
        !errorMessageElement || !commitForm || !commitMessageInput || !pushButton || !forcePushCheckbox) {
        console.error('One or more required elements are missing from the DOM');
        return;
    }

    pageContainerElement.addEventListener('update-status', function () {
        updateStatus();
        checkPushStatus();
    });

    stageAllButton.addEventListener('click', async () => {
        const success = await window.electronAPI.stageAllFiles();
        if (success) {
            await updateStatus();
        } else {
            showError('Failed to stage all files');
        }
    });

    unstageAllButton.addEventListener('click', async () => {
        const success = await window.electronAPI.unstageAllFiles();
        if (success) {
            await updateStatus();
        } else {
            showError('Failed to unstage all files');
        }
    });

    commitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = commitMessageInput.value;
        const success = await window.electronAPI.commit(message);
        if (success) {
            showMessage('Commit successful');
            commitMessageInput.value = '';
            await updateStatus();
            await checkPushStatus();
        } else {
            showError('Failed to commit');
        }
    });

    pushButton.addEventListener('click', async () => {
        const force = forcePushCheckbox.checked;
        const success = await window.electronAPI.push(force);
        if (success) {
            showMessage(`Push successful${force ? ' (force)' : ''}`);
            await checkPushStatus();
        } else {
            showError('Failed to push');
        }
    });

    function addFileToList(list: HTMLUListElement, file: string, status: string) {
        const li = document.createElement('li');
        li.className = `file-item ${status}`;

        const fileSpan = document.createElement('span');
        fileSpan.textContent = file;
        fileSpan.className = 'file-name';
        li.appendChild(fileSpan);

        const statusSpan = document.createElement('span');
        statusSpan.textContent = status;
        statusSpan.className = 'file-status';
        li.appendChild(statusSpan);

        const actionButton = document.createElement('button');
        actionButton.className = 'file-action';

        if (list === unstagedFilesList) {
            actionButton.textContent = 'Stage';
            actionButton.addEventListener('click', async () => {
                const success = await window.electronAPI.stageFile(file);
                if (success) {
                    li.remove(); // Remove the file from the unstaged list
                    await updateStatus();
                } else {
                    showError(`Failed to stage file: ${file}`);
                }
            });
        } else {
            actionButton.textContent = 'Unstage';
            actionButton.addEventListener('click', async () => {
                const success = await window.electronAPI.unstageFile(file);
                if (success) {
                    await updateStatus();
                } else {
                    showError(`Failed to unstage file: ${file}`);
                }
            });
        }

        li.appendChild(actionButton);
        list.appendChild(li);
    }

    async function updateStatus() {
        try {
            const status = await window.electronAPI.getStatus();

            stagedFilesList!.innerHTML = '';

            if (status) {
                const stagedFiles = new Set(status.staged);

                // Update staged files list
                status.staged.forEach(file => addFileToList(stagedFilesList!, file, 'staged'));

                // Remove files from unstagedFilesList that are now staged
                Array.from(unstagedFilesList!.children).forEach((li: Element) => {
                    const fileName = (li.querySelector('.file-name') as HTMLElement).textContent;
                    if (stagedFiles.has(fileName!)) {
                        li.remove();
                    }
                });

                // Function to add file to unstaged list if it's not staged
                const addIfUnstaged = (file: string, status: string) => {
                    if (!stagedFiles.has(file) && !isFileInList(unstagedFilesList!, file)) {
                        addFileToList(unstagedFilesList!, file, status);
                    }
                };

                // Add new unstaged files
                status.modified.forEach(file => addIfUnstaged(file, 'modified'));
                status.created.forEach(file => addIfUnstaged(file, 'new'));
                status.deleted.forEach(file => addIfUnstaged(file, 'deleted'));
                status.renamed.forEach(file => {
                    const renamedFile = `${file.from} → ${file.to}`;
                    addIfUnstaged(renamedFile, 'renamed');
                });
                status.conflicted.forEach(file => addIfUnstaged(file, 'conflicted'));

                unstageAllButton!.style.display = stagedFiles.size > 0 ? 'block' : 'none';
                stageAllButton!.style.display = unstagedFilesList!.children.length > 0 ? 'block' : 'none';
            }
        } catch (error) {
            console.error('Error getting repository status:', error);
            showError('Error getting repository status. Check the console for details.');
        }
    }

    function isFileInList(list: HTMLUListElement, fileName: string): boolean {
        return Array.from(list.children).some((li: Element) =>
            (li.querySelector('.file-name') as HTMLElement).textContent === fileName
        );
    }

    async function checkPushStatus() {
        try {
          const hasCommitsToPush = await window.electronAPI.hasCommitsToPush();
          pushSection!.style.display = hasCommitsToPush ? 'block' : 'none';
        } catch (error) {
          console.error('Error checking push status:', error);
        }
      }

    function showError(message: string) {
        errorMessageElement!.textContent = message;
        errorMessageElement!.style.display = 'block';
    }

    function hideError() {
        errorMessageElement!.style.display = 'none';
    }

    function showMessage(message: string) {
        alert(message);  // For now, we're using alert, but you could create a custom message box in the future
    }
});