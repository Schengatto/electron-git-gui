document.addEventListener('DOMContentLoaded', () => {
    const gitTreeContainer = document.getElementById('gitTreeContainer') as HTMLPreElement;

    async function updateGitTree() {
        if (!gitTreeContainer) {
            console.error('Git tree container element not found');
            return;
        }

        const gitTree = await window.electronAPI.getGitTree(50); // Get last 50 commits
        if (!gitTree) {
            console.error('Failed to fetch Git tree');
            return;
        }

        // Function to convert Git-specific ANSI color codes to CSS
        function gitAnsiToHtml(str: string) {
            const colorMap: { [key: string]: string } = {
                '0': '',  // Reset
                '1': 'font-weight: bold;',
                '31': 'color: red;',
                '32': 'color: green;',
                '33': 'color: yellow;',
                '34': 'color: blue;',
                '35': 'color: magenta;',
                '36': 'color: cyan;',
                '37': 'color: white;',
            };

            let result = '';
            let currentSpan = '';

            for (let i = 0; i < str.length; i++) {
                if (str[i] === '\x1b' && str[i + 1] === '[') {
                    let code = '';
                    i += 2;
                    while (str[i] !== 'm') {
                        code += str[i];
                        i++;
                    }
                    if (code === '0') {
                        result += currentSpan ? '</span>' : '';
                        currentSpan = '';
                    } else {
                        const style = colorMap[code] || '';
                        if (style) {
                            result += currentSpan ? '</span>' : '';
                            currentSpan = `<span style="${style}">`;
                            result += currentSpan;
                        }
                    }
                } else {
                    result += str[i];
                }
            }

            result += currentSpan ? '</span>' : '';
            return result;
        }

        const coloredTree = gitAnsiToHtml(gitTree);
        gitTreeContainer.innerHTML = `<pre>${coloredTree}</pre>`;
    }

    const pageContainer = document.getElementById('pageContainer');
    if (pageContainer) {
        pageContainer.addEventListener('update-status', updateGitTree);
    } else {
        console.error('Page container element not found');
    }
});