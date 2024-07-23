// Index.js

document.addEventListener('DOMContentLoaded', () => {
    const increaseBtn = document.getElementById('increase');
    const decreaseBtn = document.getElementById('decrease');
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const inputBox = document.getElementById('input');
    const saveBtn = document.getElementById('save');
    const saveTab = document.getElementById('save-tab');
    const linkLists = document.getElementById('list');
    let blockedLinks = [];

    function updateTimerDisplay(time, seconds) {
        const timer = document.getElementById('timer');
        const secondsDisplay = document.getElementById('seconds');
        timer.innerText = time;
        secondsDisplay.innerText = seconds;
        displayLinks(blockedLinks)
    }

    function updateButtonStates(isRunning) {
        stopBtn.style.display = isRunning ? 'block' : 'none';
        startBtn.style.display = isRunning ? 'none' : 'block';
        increaseBtn.disabled = isRunning;
        decreaseBtn.disabled = isRunning;
    }

    // Initialize the display with the saved time and events
    chrome.runtime.sendMessage({ action: 'getTimerValue' }, function (response) {
        updateTimerDisplay(response.time, response.seconds);
        updateButtonStates(response.isRunning);
    });

    chrome.storage.local.get(['blockedLinks'], function (result) {
        blockedLinks = result.blockedLinks || [];
        displayLinks(blockedLinks);
    });

    startBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'startTimer' });
    });

    stopBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'stopTimer' });
    });

    increaseBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'incrementTimer' });
    });

    decreaseBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'decrementTimer' });
    });

    // Listen for timer updates from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'updateTimer') {
            updateTimerDisplay(message.time, message.seconds);
            updateButtonStates(message.isRunning);
        } else if (message.action === 'linksCleared') {
            blockedLinks = [];
            displayLinks(blockedLinks);
        }
    });

    function displayLinks(blockedLinks) {
        linkLists.innerHTML = ''; // Clear the existing list

        if (blockedLinks.length === 0) {
            let p = document.createElement('p');
            p.textContent = 'No blocked links.';
            p.style.color = "White"
            linkLists.appendChild(p);
            return;
        }

        let ul = document.createElement('ul');
        linkLists.appendChild(ul);
        blockedLinks.forEach((link, i) => {
            let deleteBtn = document.createElement('button');
            deleteBtn.textContent = "Delete"
            deleteBtn.classList.add('deleteBtn')
            deleteBtn.addEventListener('click', () => {
                const linkToRemove = blockedLinks[i];
                blockedLinks.splice(i, 1)
                chrome.storage.local.set({ blockedLinks: blockedLinks }, () => {
                    // Remove the block rule for this specific link
                    chrome.runtime.sendMessage({ action: "removeBlockRule", link: linkToRemove });
                    displayLinks(blockedLinks);
                });
            })
            let li = document.createElement('li');
            li.classList.add('li')
            let a = document.createElement('a');
            a.href = link;
            a.textContent = link;
            a.target = "_blank";
            a.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'blocked.html';
            });

            li.appendChild(a);
            li.append(deleteBtn);
            ul.appendChild(li);
        });
    }

    saveTab.addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentTabLink = tabs[0].url;
            if (!blockedLinks.includes(currentTabLink)) {
                blockedLinks.unshift(currentTabLink);
                chrome.storage.local.set({ blockedLinks: blockedLinks })
                displayLinks(blockedLinks);
            }
        });
    })

    saveBtn.addEventListener('click', () => {
        const links = inputBox.value
        if (!blockedLinks.includes(links)) {
            blockedLinks.unshift(links)
            chrome.storage.local.set({ blockedLinks: blockedLinks })
            inputBox.value = ''
            displayLinks(blockedLinks)
        }
    })
});