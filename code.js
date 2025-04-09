document.addEventListener('DOMContentLoaded', () => {
    const industriesData = [
        { Name: "Farming", Input: null, Output: "wheat", Output_quantity: 100 },
        { Name: "Mining", Input: null, Output: "copper", Output_quantity: 50 },
        { Name: "Livestock", Input: null, Output: "milk", Output_quantity: 100 },
        { Name: "Hunting & Fishing", Input: null, Output: "beef", Output_quantity: 100 },
        { Name: "Oil & gas", Input: null, Output: "crude oil", Output_quantity: 100 }
    ];

    const robotNames = ["RoboCorp", "BotWorks", "Synth Inc.", "AI Systems", "Mech Co.", "Droid Dyn.", "Circuit LLC"];
    let players = [];
    let materialsForAuction = [];
    let auctionInterval;
    let robotBidInterval;
    let timer = 60; // Auction duration in seconds
    let selectedMaterialIndex = -1; // Index of the material selected by the human player

    const playersListDiv = document.getElementById('players-list');
    const materialsListDiv = document.getElementById('materials-list');
    const timerSpan = document.getElementById('time');
    const bidControlsDiv = document.getElementById('bid-controls');
    const selectedMaterialSpan = document.getElementById('selected-material-name');
    const bidAmountInput = document.getElementById('bid-amount');
    const placeBidButton = document.getElementById('place-bid-button');
    const bidErrorP = document.getElementById('bid-error');
    const resultsSectionDiv = document.getElementById('results-section');
    const auctionResultsDiv = document.getElementById('auction-results');
    const finalPlayersListDiv = document.getElementById('final-players-list');
    const auctionLogList = document.getElementById('log-list');

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function logAuctionEvent(message) {
        const li = document.createElement('li');
        li.textContent = `[${60 - timer}s] ${message}`;
        auctionLogList.prepend(li); // Add new logs to the top
        li.classList.add('highlight-log');
        setTimeout(() => li.classList.remove('highlight-log'), 1500); // Remove highlight after a bit
    }


    function initializeGame() {
        // 1. Create Players (simulate Phase 1 outcome)
        players = [];
        const availableRobotNames = [...robotNames];
        shuffleArray(availableRobotNames);

        // Human Player
        players.push({
            name: "You",
            isHuman: true,
            money: getRandomInt(100, 180), // Remaining money after simulated Phase 1 bid
            industry: null, // Will be assigned below
            inventory: {}
        });

        // Robot Players
        for (let i = 0; i < 7; i++) {
            players.push({
                name: availableRobotNames[i],
                isHuman: false,
                money: getRandomInt(50, 190), // Robots might have bid differently
                industry: null,
                inventory: {}
            });
        }

        // 2. Assign Industries (simulate Phase 1 auction results)
        let industriesToAssign = [];
        while (industriesToAssign.length < 8) {
            industriesToAssign.push(industriesData[getRandomInt(0, industriesData.length - 1)]);
        }
        shuffleArray(industriesToAssign); // Randomize assignment order

        players.forEach((player, index) => {
            player.industry = industriesToAssign[index];
        });

        // 3. Prepare Materials for Auction
        materialsForAuction = [];
        players.forEach(player => {
            if (player.industry && player.industry.Output) {
                materialsForAuction.push({
                    id: `material-${materialsForAuction.length}`, // Unique ID for targeting elements
                    material: player.industry.Output,
                    quantity: player.industry.Output_quantity,
                    seller: player.name,
                    currentBid: 0,
                    highestBidder: null
                });
            }
        });

        // 4. Initial Render
        renderPlayers();
        renderMaterials();
        timerSpan.textContent = timer;

        // 5. Start Auction
        startAuctionTimer();
        startRobotBidding();

        logAuctionEvent("Phase 2: Materials Auction Started!");
    }

    function renderPlayers(final = false) {
        const listDiv = final ? finalPlayersListDiv : playersListDiv;
        listDiv.innerHTML = ''; // Clear previous list
        players.forEach(player => {
            const card = document.createElement('div');
            card.classList.add('player-card');
            if (player.isHuman) {
                card.classList.add('human');
            }
            let inventoryString = "";
             if (final) {
                 inventoryString = Object.entries(player.inventory)
                                     .map(([mat, qty]) => `${mat}: ${qty}`)
                                     .join(', ') || 'None';
                 inventoryString = `<br>Inventory: ${inventoryString}`;
            }

            card.innerHTML = `
                <strong>${player.name} ${player.isHuman ? '(You)' : '(Bot)'}</strong><br>
                Money: $${player.money}<br>
                Industry: ${player.industry ? player.industry.Name : 'None'}
                ${inventoryString}
            `;
            listDiv.appendChild(card);
        });
    }

    function renderMaterials() {
        materialsListDiv.innerHTML = '';
        materialsForAuction.forEach((item, index) => {
            const div = document.createElement('div');
            div.classList.add('material-item');
            div.id = item.id; // Assign unique ID
            div.innerHTML = `
                <h4>${item.material} (${item.quantity})</h4>
                <p>Seller: ${item.seller}</p>
                <p>Current Bid: $<span class="current-bid">${item.currentBid}</span></p>
                <p>Highest Bidder: <span class="highest-bidder">${item.highestBidder || 'None'}</span></p>
                <button class="select-bid-button" data-index="${index}">Select for Bidding</button>
            `;
            materialsListDiv.appendChild(div);

             // Add highlight if just updated
            if (item.justUpdated) {
                div.classList.add('highlight');
                // Remove highlight after animation
                setTimeout(() => {
                    div.classList.remove('highlight');
                    item.justUpdated = false; // Reset flag
                }, 1000);
            }
        });

        // Re-attach event listeners for the select buttons
        document.querySelectorAll('.select-bid-button').forEach(button => {
            button.addEventListener('click', handleSelectMaterial);
        });
    }

    function handleSelectMaterial(event) {
        if (timer <= 0) return; // Don't allow selection after auction ends

        selectedMaterialIndex = parseInt(event.target.getAttribute('data-index'));
        const selectedMaterial = materialsForAuction[selectedMaterialIndex];

        selectedMaterialSpan.textContent = `${selectedMaterial.material} (Current Bid: $${selectedMaterial.currentBid})`;
        bidAmountInput.value = selectedMaterial.currentBid + 1; // Suggest next bid
        bidAmountInput.min = selectedMaterial.currentBid + 1;
        bidErrorP.textContent = '';
        bidControlsDiv.style.display = 'block';
    }

     function updateMaterialDisplay(index) {
        const item = materialsForAuction[index];
        const itemElement = document.getElementById(item.id);
        if (itemElement) {
            itemElement.querySelector('.current-bid').textContent = item.currentBid;
            itemElement.querySelector('.highest-bidder').textContent = item.highestBidder || 'None';
             item.justUpdated = true; // Flag for highlighting
             renderMaterials(); // Re-render to apply highlight class (simplest way)

             // If this is the currently selected item by human, update bid controls too
             if (index === selectedMaterialIndex) {
                 selectedMaterialSpan.textContent = `${item.material} (Current Bid: $${item.currentBid})`;
                 bidAmountInput.min = item.currentBid + 1;
                 if (parseInt(bidAmountInput.value) <= item.currentBid) {
                     bidAmountInput.value = item.currentBid + 1;
                 }
             }
        } else {
            console.error("Could not find element for material ID:", item.id);
        }
    }


    function placeBid(playerIndex, materialIndex, amount) {
        const player = players[playerIndex];
        const material = materialsForAuction[materialIndex];

        // Basic validations
        if (amount <= material.currentBid) {
             if (player.isHuman) bidErrorP.textContent = 'Your bid must be higher than the current bid.';
             console.log(`${player.name} bid too low on ${material.material}`);
            return false;
        }
        if (amount > player.money) {
             if (player.isHuman) bidErrorP.textContent = 'You do not have enough money for this bid.';
             console.log(`${player.name} doesn't have enough money for $${amount} bid on ${material.material}`);
            return false;
        }
         // Prevent bidding against oneself (optional, but good for robots)
        if (material.highestBidder === player.name) {
             console.log(`${player.name} is already highest bidder on ${material.material}`);
            return false;
        }


        // Update auction state
        material.currentBid = amount;
        material.highestBidder = player.name;

        // Update UI
        updateMaterialDisplay(materialIndex);
         if (player.isHuman) {
            bidErrorP.textContent = ''; // Clear error on successful bid
             // Optionally hide bid controls after successful bid, or just update them
             // bidControlsDiv.style.display = 'none';
             // selectedMaterialIndex = -1;
         }

        logAuctionEvent(`${player.name} bid $${amount} on ${material.material}`);
        return true;
    }


    function handleHumanBid() {
        if (selectedMaterialIndex === -1 || timer <= 0) return;

        const bidAmount = parseInt(bidAmountInput.value);
        const humanPlayerIndex = players.findIndex(p => p.isHuman);

        if (isNaN(bidAmount) || bidAmount <= 0) {
            bidErrorP.textContent = 'Please enter a valid bid amount.';
            return;
        }

        placeBid(humanPlayerIndex, selectedMaterialIndex, bidAmount);
         // No need to re-render players here unless money changes instantly (it shouldn't until auction end)
    }


    function simulateRobotBids() {
        if (timer <= 0) return;

        const robotPlayerIndex = getRandomInt(1, players.length - 1); // Index 0 is human
        const robot = players[robotPlayerIndex];

        if (materialsForAuction.length === 0) return;

        const materialIndex = getRandomInt(0, materialsForAuction.length - 1);
        const material = materialsForAuction[materialIndex];

        // Simple robot logic: bid slightly higher if they aren't winning and can afford it
        const bidAmount = material.currentBid + getRandomInt(1, 10); // Random small increment

        // Robots don't bid if they are already the highest bidder or can't afford it
         if (robot.name !== material.highestBidder && bidAmount <= robot.money) {
             // Add a random chance they actually bid, otherwise robots bid too fast
             if (Math.random() < 0.3) { // ~30% chance to bid each cycle per robot
                placeBid(robotPlayerIndex, materialIndex, bidAmount);
            }
         }
    }

    function startAuctionTimer() {
        auctionInterval = setInterval(() => {
            timer--;
            timerSpan.textContent = timer;
            if (timer <= 0) {
                endAuction();
            }
        }, 1000);
    }

     function startRobotBidding() {
        // Robots attempt to bid at random intervals
        robotBidInterval = setInterval(simulateRobotBids, 750); // Robots think/bid every 750ms
    }

    function endAuction() {
        clearInterval(auctionInterval);
        clearInterval(robotBidInterval);
        timer = 0;
        timerSpan.textContent = timer;
        timerSpan.parentElement.textContent = "Auction Ended!";
        timerSpan.parentElement.style.color = '#28a745'; // Green color for ended
        logAuctionEvent("Auction Ended!");


        // Disable bidding controls
        bidControlsDiv.style.display = 'none';
        document.querySelectorAll('.select-bid-button').forEach(button => {
             button.disabled = true;
             button.style.backgroundColor = '#6c757d'; // Grey out
             button.textContent = "Auction Over";
        });


        // Process results
        let resultsHTML = '<ul>';
        materialsForAuction.forEach(item => {
            if (item.highestBidder) {
                const winner = players.find(p => p.name === item.highestBidder);
                if (winner) {
                    // Deduct money
                    winner.money -= item.currentBid;
                    // Add to inventory
                    if (!winner.inventory[item.material]) {
                        winner.inventory[item.material] = 0;
                    }
                    winner.inventory[item.material] += item.quantity;
                    resultsHTML += `<li>${item.material} (${item.quantity}) sold to ${winner.name} for $${item.currentBid}</li>`;
                     logAuctionEvent(`${item.material} awarded to ${winner.name} for $${item.currentBid}.`);
                } else {
                     resultsHTML += `<li>${item.material} (${item.quantity}) - Error: Winner ${item.highestBidder} not found!</li>`; // Should not happen
                }
            } else {
                resultsHTML += `<li>${item.material} (${item.quantity}) - Not sold (No bids)</li>`;
                 logAuctionEvent(`${item.material} received no bids.`);
            }
        });
        resultsHTML += '</ul>';

        auctionResultsDiv.innerHTML = resultsHTML;
        renderPlayers(true); // Render final player status with inventory

        resultsSectionDiv.style.display = 'block';
        auctionLogList.parentElement.style.maxHeight = 'none'; // Allow log to show fully
    }

    // Attach event listeners
    placeBidButton.addEventListener('click', handleHumanBid);

    // Initialize and start the game
    initializeGame();
});