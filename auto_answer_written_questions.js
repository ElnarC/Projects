// ==UserScript==
// @name         Edgenuity Gemini Assistant
// @version      1.8
// @description  Automatically answers Online Content with auto-submit and Journal Activity assignments using Gemini API
// @author       You
// @match        *://*.core.learn.edgenuity.com/*
// @match        https://student.edgenuity.com/*
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const GEMINI_API_KEY = "";
    const DEBUG_MODE = true;

    function debugLog(...args) {
        if (DEBUG_MODE) {
            console.log("[Gemini Assistant]", ...args);
        }
    }

    function checkForSupportedAssignments() {
        const activityTitleElement = document.getElementById('activity-title');
        if (!activityTitleElement) {
            debugLog("No activity title found");
            return;
        }

        const activityTitle = activityTitleElement.innerText;
        debugLog("Current activity:", activityTitle);

        const stageFrame = document.getElementById('stageFrame');
        if (!stageFrame) {
            debugLog("Could not find stage frame");
            return;
        }

        if (activityTitle.includes("Online Content")) {
            debugLog("Found Online Content assignment!");
            setTimeout(() => processAssignment(stageFrame, "Online Content"), 2000);
        } else if (activityTitle.includes("Journal Activity")) {
            debugLog("Found Journal Activity assignment!");
            setTimeout(() => processAssignment(stageFrame, "Journal Activity"), 2000);
        }
    }

    function processAssignment(stageFrame, assignmentType) {
        try {
            const frameDoc = stageFrame.contentDocument || stageFrame.contentWindow.document;
            if (!frameDoc) {
                debugLog("Could not access frame document");
                return;
            }

            if (DEBUG_MODE) {
                debugLog("Frame document HTML structure:");
                debugLog(frameDoc.body.innerHTML.substring(0, 500) + "...");
            }

            const questionXPath = assignmentType === "Journal Activity"
                ? '/html/body/div[3]/form/div[1]/div/div/div[1]/div[1]'
                : '/html/body/div[3]/form/div[1]/div[2]/p';

            let questionElement;
            try {
                questionElement = document.evaluate(questionXPath, frameDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            } catch (e) {
                debugLog("XPath evaluation error:", e);
                questionElement = null;
            }

            let questionText = questionElement ? questionElement.textContent.trim() : "";

            if (!questionText) {
                debugLog("XPath failed, trying fallback selectors");
                const fallbackSelectors = [
                    '.question-text',
                    '.prompt',
                    '.assignment-content',
                    'p:not(:empty)',
                    'div:not(:empty)'
                ];

                for (const selector of fallbackSelectors) {
                    const element = frameDoc.querySelector(selector);
                    if (element && element.textContent.trim()) {
                        questionText = element.textContent.trim();
                        debugLog(`Found question using selector: ${selector}`);
                        break;
                    }
                }
            }

            if (!questionText) {
                debugLog("No question text found after all attempts");
                return;
            }
            debugLog("Found question:", questionText);

            const editorIframe = frameDoc.querySelector('iframe.cke_wysiwyg_frame');
            if (editorIframe) {
                debugLog("Found CKEditor iframe");
                const editorDocument = editorIframe.contentDocument || editorIframe.contentWindow.document;
                const editorBody = editorDocument.body;

                if (editorBody) {
                    debugLog("Found CKEditor body in iframe:", editorBody);
                    generateGeminiResponse(questionText, (response) => {
                        debugLog("Generated response:", response);
                        fillCKEditorIframe(editorBody, response, editorDocument);
                        if (assignmentType === "Online Content") {
                            autoSubmitAssignment(frameDoc);
                        } else {
                            showConfirmationPrompt(frameDoc, response, editorBody, editorDocument);
                        }
                    });
                    return;
                }
            }

            const editorBody = frameDoc.querySelector('body[contenteditable="true"]');
            if (!editorBody) {
                debugLog("Could not find CKEditor body");
                return;
            }

            debugLog("Found CKEditor body:", editorBody);
            debugLog("CKEditor body HTML:", editorBody.innerHTML);

            generateGeminiResponse(questionText, (response) => {
                debugLog("Generated response:", response);
                fillCKEditor(editorBody, response, frameDoc);
                if (assignmentType === "Online Content") {
                    autoSubmitAssignment(frameDoc);
                } else {
                    showConfirmationPrompt(frameDoc, response, editorBody);
                }
            });
        } catch (error) {
            console.error(`Error processing ${assignmentType}:`, error);
        }
    }

    function fillCKEditorIframe(editorBody, response, editorDocument) {
        try {
            debugLog("Filling CKEditor iframe...");
            editorBody.innerHTML = '';
            const paragraph = editorDocument.createElement('p');
            paragraph.textContent = response;
            editorBody.appendChild(paragraph);
            const events = ['input', 'change', 'keyup'];
            events.forEach(eventType => {
                editorBody.dispatchEvent(new Event(eventType, { bubbles: true }));
            });
            debugLog("CKEditor iframe filled successfully");
        } catch (error) {
            debugLog("Error filling CKEditor iframe:", error);
        }
    }

    function fillCKEditor(editorBody, response, frameDoc) {
        try {
            debugLog("Filling CKEditor...");
            try {
                const ckeditorInstance = frameDoc.defaultView.CKEDITOR?.instances?.Answer;
                if (ckeditorInstance) {
                    debugLog("Found CKEditor instance, using API to set data");
                    ckeditorInstance.setData(response);
                    return;
                }
            } catch (ckeError) {
                debugLog("CKEditor API error:", ckeError);
            }

            editorBody.innerHTML = '';
            const paragraph = frameDoc.createElement('p');
            paragraph.textContent = response;
            editorBody.appendChild(paragraph);

            debugLog("Directly replaced content with new paragraph");
            const events = ['input', 'change', 'keyup'];
            events.forEach(eventType => {
                editorBody.dispatchEvent(new Event(eventType, { bubbles: true }));
            });

            setTimeout(() => {
                debugLog("CKEditor content after filling:", editorBody.innerHTML);
            }, 500);
        } catch (error) {
            debugLog("Error filling CKEditor:", error);
        }
    }

    function showConfirmationPrompt(frameDoc, response, editorBody, editorDocument) {
        const existingPrompt = document.getElementById('gemini-confirmation');
        if (existingPrompt) existingPrompt.remove();

        const promptDiv = document.createElement('div');
        promptDiv.id = 'gemini-confirmation';
        promptDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background-color: white; border: 1px solid black; padding: 20px;
            z-index: 10000; max-width: 80%; max-height: 80%; overflow: auto;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        `;
        promptDiv.innerHTML = `
            <h3>Confirm Submission</h3>
            <p><strong>Answer:</strong> ${response}</p>
            <button id="confirm-submit">Submit</button>
            <button id="cancel-submit" style="margin-left: 10px;">Cancel</button>
        `;

        document.body.appendChild(promptDiv);

        document.getElementById('confirm-submit').onclick = () => {
            debugLog("Submission confirmed");
            submitAnswer(frameDoc);
            promptDiv.remove();
        };

        document.getElementById('cancel-submit').onclick = () => {
            debugLog("Submission canceled");
            if (editorDocument) {
                editorBody.innerHTML = '<p><br></p>';
            } else {
                editorBody.innerHTML = '<p><br></p>';
            }
            promptDiv.remove();
        };
    }

    function autoSubmitAssignment(frameDoc) {
        // Replace the submit button
        const oldSubmitButton = frameDoc.querySelector('#SubmitButton') || frameDoc.querySelector('.uibtn-blue');
        if (oldSubmitButton) {
            const newSubmitButton = frameDoc.createElement('input');
            newSubmitButton.type = 'submit';
            newSubmitButton.name = 'action:submit';
            newSubmitButton.value = 'Submit';
            newSubmitButton.className = 'uibtn uibtn-blue uibtn-alt uibtn-med';
            newSubmitButton.id = 'SubmitQuestionsButton';
            oldSubmitButton.parentNode.replaceChild(newSubmitButton, oldSubmitButton);
            debugLog("Submit button replaced with new auto-submit button");
        }

        // Auto-submit after 2-5 seconds
        const delay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000; // Random delay between 2-5 seconds
        debugLog(`Scheduling auto-submit in ${delay/1000} seconds`);

        setTimeout(() => {
            const submitButton = frameDoc.querySelector('#SubmitQuestionsButton');
            if (submitButton) {
                debugLog("Auto-submitting assignment");
                submitButton.click();
                submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            } else {
                debugLog("Could not find SubmitQuestionsButton, trying fallback submit");
                submitAnswer(frameDoc);
            }
        }, delay);
    }

    function submitAnswer(frameDoc) {
        const submitButton = frameDoc.querySelector('#SubmitQuestionsButton') || frameDoc.querySelector('#SubmitButton');
        if (submitButton) {
            try {
                debugLog("Found submit button:", submitButton.id || submitButton.className);
                submitButton.click();
                submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                return;
            } catch (e) {
                debugLog("Error clicking submit button:", e);
            }
        }

        const blueButton = frameDoc.querySelector('.uibtn-blue');
        if (blueButton) {
            try {
                debugLog("Found submit button with class 'uibtn-blue'");
                blueButton.click();
                blueButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                return;
            } catch (e) {
                debugLog("Error clicking blue button:", e);
            }
        }

        const allButtons = frameDoc.querySelectorAll('button, input[type="button"], input[type="submit"]');
        for (const button of allButtons) {
            const buttonText = (button.textContent || button.value || '').toLowerCase();
            if (buttonText.includes('submit') || buttonText.includes('next') || buttonText.includes('continue')) {
                try {
                    debugLog("Found button with submit-like text:", buttonText);
                    button.click();
                    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                    return;
                } catch (e) {
                    debugLog("Error clicking text-matched button:", e);
                }
            }
        }

        debugLog("Could not find any way to submit the answer");
    }

    function generateGeminiResponse(question, callback) {
        const prompt = `Answer the following question in one concise paragraph (100-150 words) as if written by a student using simple language: ${question}`;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        debugLog("Sending request to Gemini API:", apiUrl);

        GM_xmlhttpRequest({
            method: "POST",
            url: apiUrl,
            data: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 150 }
            }),
            headers: { "Content-Type": "application/json" },
            onload: function(response) {
                try {
                    debugLog("Received response from Gemini API");
                    const data = JSON.parse(response.responseText);

                    if (data.error) {
                        debugLog("Gemini API error:", data.error);
                        tryFallbackModel(question, callback);
                        return;
                    }

                    if (data.candidates && data.candidates[0].content.parts[0].text) {
                        callback(data.candidates[0].content.parts[0].text.trim());
                    } else {
                        debugLog("No valid response from Gemini API");
                        tryFallbackModel(question, callback);
                    }
                } catch (error) {
                    debugLog("Error parsing Gemini response:", error);
                    tryFallbackModel(question, callback);
                }
            },
            onerror: function(error) {
                debugLog("Gemini API request failed:", error);
                tryFallbackModel(question, callback);
            }
        });
    }

    function tryFallbackModel(question, callback) {
        debugLog("Trying fallback Gemini model");
        const prompt = `Answer the following question in one concise paragraph (100-150 words) as if written by a student using simple language: ${question}`;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

        GM_xmlhttpRequest({
            method: "POST",
            url: apiUrl,
            data: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 150
                }
            }),
            headers: { "Content-Type": "application/json" },
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    if (data.candidates && data.candidates[0].content.parts[0].text) {
                        callback(data.candidates[0].content.parts[0].text.trim());
                    } else {
                        callback("Error: Could not generate a response after multiple attempts.");
                    }
                } catch (error) {
                    debugLog("Error with fallback model:", error);
                    callback("Error: Failed to generate a response.");
                }
            },
            onerror: function(error) {
                debugLog("Fallback API request failed:", error);
                callback("Error: API requests failed.");
            }
        });
    }

    function addStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: fixed; bottom: 10px; right: 10px;
            background-color: rgba(0, 128, 0, 0.7); color: white;
            padding: 5px 10px; border-radius: 5px; z-index: 9999;
            font-size: 12px; cursor: pointer;
        `;
        indicator.textContent = 'Gemini Assistant Active';
        document.body.appendChild(indicator);

        indicator.addEventListener('click', () => {
            const stageFrame = document.getElementById('stageFrame');
            const frameDoc = stageFrame?.contentDocument || stageFrame?.contentWindow?.document;

            const debugInfo = document.createElement('div');
            debugInfo.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background-color: white; border: 1px solid black; padding: 20px;
                z-index: 10000; max-width: 80%; max-height: 80%; overflow: auto;
            `;

            let debugContent = `
                <h3>Gemini Assistant Debug</h3>
                <p>Activity: ${document.getElementById('activity-title')?.innerText || "None"}</p>
                <p>Frame: ${frameDoc ? "Found" : "Not Found"}</p>
            `;

            if (frameDoc) {
                const editorIframe = frameDoc.querySelector('iframe.cke_wysiwyg_frame');
                const editorBody = frameDoc.querySelector('body[contenteditable="true"]');
                const submitButton = frameDoc.querySelector('#SubmitQuestionsButton') || frameDoc.querySelector('#SubmitButton');

                debugContent += `
                    <p>CKEditor iframe: ${editorIframe ? "Found" : "Not Found"}</p>
                    <p>CKEditor body: ${editorBody ? "Found" : "Not Found"}</p>
                    <p>CKEditor HTML: ${editorBody ? editorBody.innerHTML : (editorIframe ? "In iframe" : "N/A")}</p>
                    <p>Submit Button: ${submitButton ? "Found" : "Not Found"}</p>
                `;

                debugContent += `
                    <button id="test-fill">Test Fill CKEditor</button>
                    <button id="test-submit" style="margin-left: 10px;">Test Submit</button>
                `;
            }

            debugContent += `<button id="debug-close" style="margin-top: 10px;">Close</button>`;
            debugInfo.innerHTML = debugContent;
            document.body.appendChild(debugInfo);

            document.getElementById('debug-close').onclick = () => document.body.removeChild(debugInfo);

            if (frameDoc) {
                document.getElementById('test-fill')?.addEventListener('click', () => {
                    const editorIframe = frameDoc.querySelector('iframe.cke_wysiwyg_frame');
                    if (editorIframe) {
                        const editorDocument = editorIframe.contentDocument || editorIframe.contentWindow.document;
                        const editorBody = editorDocument.body;
                        if (editorBody) {
                            const testText = "This is a test response from the Gemini Assistant debug panel.";
                            fillCKEditorIframe(editorBody, testText, editorDocument);
                            alert("Test text inserted into iframe. Check if it appears in the CKEditor.");
                            return;
                        }
                    }

                    const editorBody = frameDoc.querySelector('body[contenteditable="true"]');
                    if (editorBody) {
                        const testText = "This is a test response from the Gemini Assistant debug panel.";
                        fillCKEditor(editorBody, testText, frameDoc);
                        alert("Test text inserted. Check if it appears in the CKEditor.");
                    } else {
                        alert("Could not find CKEditor body or iframe.");
                    }
                });

                document.getElementById('test-submit')?.addEventListener('click', () => {
                    submitAnswer(frameDoc);
                    alert("Submit action attempted. Check if the form was submitted.");
                });
            }
        });
    }

    addStatusIndicator();
    setInterval(checkForSupportedAssignments, 3000);
})();
