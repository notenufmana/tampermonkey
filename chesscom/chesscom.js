// ==UserScript==
// @name         ChessCom
// @namespace    http://tampermonkey.net/
// @version      2024-06-12
// @description  Add button for 'Lichess Analysis' on chess.com
// @author       longkidkoolstar (original), notenufmana
// @match        https://www.chess.com/*
// @icon         https://cdn4.iconfinder.com/data/icons/chess-game-funny-colour/32/chess_game_funy_colour_ok_13-1024.png
// @require      https://raw.githubusercontent.com/uzairfarooq/arrive/master/minified/arrive.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    // Function to prompt the user for their OAuth token
    function promptForOAuthToken() {
        var token = prompt("Please enter your Lichess OAuth2 token:");
        if (token) {
            GM_setValue('lichessOAuthToken', token); // Save the token to GM_setValue
            return token;
        } else {
            alert("You must provide a valid OAuth token to use the script.");
            return null;
        }
    }

    // Get the OAuth token from GM_setValue or prompt the user
    var oauthToken = GM_getValue('lichessOAuthToken');
    if (!oauthToken) {
        oauthToken = promptForOAuthToken();
        if (!oauthToken) {
            return; // Stop the script if no token is provided
        }
    }

    // Injects a button similar to chess.com's native "Game Review" button
    function injectButton(analysisButton) {

        // Duplicate the original button
        let newButton = analysisButton.cloneNode(true);

        // Style it and link it to the Lichess import function
        newButton.childNodes[3].innerText = 'Lichess Analysis'
        newButton.style.margin = '8px 0px 0px 0px';
        //newButton.style.padding = '0px 0px 0px 0px';
        //newButton.childNodes[1].classList.remove('icon-font-chess')
        //newButton.childNodes[1].classList.add('button-class');
        //newButton.classList.add('shine-hope-anim');
        //newButton.childNodes[3].style['color'] = '3.805rem';
        newButton.addEventListener('click', sendToLichess); // Update the click event handler);

        // Append back into the DOM
        let parentNode = analysisButton.parentNode;
        parentNode.append(newButton);
    }

    // async POST function with the OAuth token in the headers
    async function post(url = '', data = {}, token) {
        var formBody = [];
        for (var property in data) {
            var encodedKey = encodeURIComponent(property);
            var encodedValue = encodeURIComponent(data[property]);
            formBody.push(encodedKey + '=' + encodedValue);
        }
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${token}`, // Include the OAuth token in the headers
            },
            body: formBody.join('&'),
        });
        return response.json();
    }

    // Make request to Lichess through the API (fetch)
    function sendToLichess() {
        // 1. Get PGN
        // Get and click download button on chess.com
        let downloadButton = document.getElementsByClassName('icon-font-chess share live-game-buttons-button')[0];
        downloadButton.click();

        // Wait for share tab to pop up
        document.arrive('.share-menu-tab-pgn-textarea', function() {
            Arrive.unbindAllArrive();

            // Get PGN from text Area
            var PGN = document.getElementsByClassName('share-menu-tab-pgn-textarea')[0].value;

            // Exit out of download view (x button)
            document.querySelector('div.icon-font-chess.x.ui_outside-close-icon').click();

            // 2. Send a POST request to Lichess to import the current game
            let importUrl = 'https://lichess.org/api/import';
            let req = { pgn: PGN };
            post(importUrl, req, oauthToken) // Pass the OAuth token to the post function
                .then((response) => {
                    // Open the page on a new tab
                    let url = response['url'] ? response['url'] : '';
                    if (url) {
                        let lichessPage = window.open(url);
                    } else alert('Could not import game');
                })
                .catch((e) => {
                    console.error('Error getting response from lichess.org', e);
                    alert('Error getting response from lichess.org');
                    throw new Error('Response error');
                });
        });
    }

    // main loop start
    checkGameStatus();

    function checkGameStatus() {
        // watch for the creation of chesscom's "Game Review" button which only
        // happens when a game is completed
        document.arrive('.game-review-buttons-review', function() {

            // select the "Game Review" button
            var analysisButton = document.querySelector('button.ui_v5-button-component.ui_v5-button-primary.game-review-buttons-button');

            if (analysisButton.className == 'ui_v5-button-component ui_v5-button-primary game-review-buttons-button') {

                // make sure to remove listeners when they are no longer needed, it's better for performance
                // unbind all arrive events on document element
                Arrive.unbindAllArrive();

                // inject a button for Lichess analysis
                injectButton(analysisButton);

                // main loop repeat
                checkGameStatus();
            }
        });
    }

})();
