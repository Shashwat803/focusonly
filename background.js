// Background.js

let time = 0;
let seconds = 0;
let minuteInterval;
let secondInterval;
let isRunning = false;

function startTimer() {
  if (!isRunning) {
    isRunning = true;
    runTimer();
  }
}

function stopTimer() {
  isRunning = false;
  clearInterval(minuteInterval);
  clearInterval(secondInterval);
  time = 0;
  seconds = 0;
  chrome.storage.local.remove(['timerValue', 'blockedLinks'], () => {
    // After removing from storage, clear the block rules
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from({ length: 1000 }, (_, i) => i + 1) // Remove all potential rule IDs
    }, () => {
      // Notify the popup that the timer has stopped and links are cleared
      updatePopup();
      chrome.runtime.sendMessage({ action: 'linksCleared' });
    });
  });
  updatePopup()
}

function runTimer() {
  if (time > 0 || (time === 0 && seconds > 0)) {
    runSeconds();
    minuteInterval = setInterval(() => {
      if (time > 0) {
        time -= 1;
        chrome.storage.local.set({ timerValue: time });
        updatePopup();
        if (time <= 0 && seconds <= 0) {
          stopTimer();
        }
      }
    }, 60000);
  }
}

function runSeconds() {
  if (time > 0 || (time === 0 && seconds > 0)) {
    secondInterval = setInterval(() => {
      if (seconds > 0) {
        seconds -= 1;
        updatePopup();
        if (seconds <= 0 && time > 0) {
          seconds = 60;
        }
        if (time <= 0 && seconds <= 0) {
          stopTimer();
        }
      }
    }, 1000);
  }
}

function updatePopup() {
  chrome.runtime.sendMessage({ action: 'updateTimer', time, seconds, isRunning });
}

function incrementTimer() {
  time += 1;
  seconds = 60;
  chrome.storage.local.set({ timerValue: time });
  updatePopup();
}

function decrementTimer() {
  if (time > 0) {
    time -= 1;
    seconds = 60;
    chrome.storage.local.set({ timerValue: time });
    updatePopup();
  }
}

// Load saved timer value
chrome.storage.local.get(['timerValue'], function (result) {
  time = result.timerValue || 0;
  seconds = time > 0 ? 60 : 0;
  updatePopup();
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startTimer':
      startTimer();
      break;
    case 'stopTimer':
      stopTimer();
      break;
    case 'incrementTimer':
      incrementTimer();
      break;
    case 'decrementTimer':
      decrementTimer();
      break;
    case 'getTimerValue':
      sendResponse({ time, seconds, isRunning });
      break;
  }
});

function updateBlockRules(blockedLinks) {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: blockedLinks.map((_, index) => index + 1),
    addRules: blockedLinks.map((link, index) => {
      const url = new URL(link);
      const domain = url.hostname.replace('www.', '');
      return {
        id: index + 1,
        priority: 1,
        action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
        condition: {
          urlFilter: `||${domain}`,
          resourceTypes: ["main_frame"]
        }
      };
    })
  });
}

function removeBlockRule(linkToRemove) {
  chrome.declarativeNetRequest.getDynamicRules(rules => {
    const ruleToRemove = rules.find(rule => {
      const url = new URL(linkToRemove);
      const domain = url.hostname.replace('www.', '');
      return rule.condition.urlFilter === `||${domain}`;
    });

    if (ruleToRemove) {
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleToRemove.id]
      });
    }
  });
}

chrome.storage.local.get(['blockedLinks'], function (result) {
  let blockedLinks = result.blockedLinks || [];
  updateBlockRules(blockedLinks);
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (namespace === 'local' && changes.blockedLinks) {
    updateBlockRules(changes.blockedLinks.newValue);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "removeBlockRule") {
    removeBlockRule(message.link);
  }
});