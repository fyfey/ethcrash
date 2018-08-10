const fs = require('fs');
const process = require('process');
const EventEmitter = require('events');
require('colors');

const START_GAME = 1129149;
const NUM_GAMES = 999;

const OutOfCashException = {};

class Engine {

    constructor(balance) {
        this.wins = 0;
        this.losses = 0;
        this.balance = balance * 100;
        this.minBalance = 999999999;
        this.maxBalance = 0;
        this.totalProfit = 0;
        this.maxLossStreak = 0;
        this.maxWinStreak = 0;
        this.lossStreak = 0;
        this.winStreak = 0;
        this.lastGame = {};
        this.events = {
            game_starting: _ => {},
            game_crash: _ => {},
            game_ended: _ => {}
        }
    }

    on(event, cb) {
        this.events[event.toLowerCase()] = cb;
    }

    bet(amount, rate) {
        rate *= 100;
        return this.placeBet(amount, rate);
    }

    placeBet(amount, rate, cb) {
        //console.log('bet placed', amount/100, rate/100+'%');
        this.balance -= amount;
        this.lastBet = amount;
        this.lastRate = rate;
        if (cb) {
            cb.call(null);
        }
    }

    get history() {
        var lastGame = this.lastGame;
        return {
            first() {
                return {
                    bust: lastGame.game_crash/100
                }
            }
        }
    }

    getLastBet() {
        return this.lastBet/100;
    }

    run() {
        var i = 0;
        fs.readdir(`${__dirname}/games`, (err, files) => {
            try {
                files.sort((a, b) => {
                    return a < b ? -1 : 1;
                }).forEach((file, key) => {
                    if (i > 3000) {
                        throw new Error('Time to stop!');
                    }
                    const contents = fs.readFileSync(`${__dirname}/games/${file}`);
                    const json = JSON.parse(contents);
                    this.handleRun(json);
                    i++;
                });
            } catch (e) {
                if (e === OutOfCashException) {
                    console.error('Out of cash!'.red);
                }
            }
            this.handleEnd()
        });
    }

    handleRun(json) {
        var startBalance = this.balance;

        // Game starting...
        this.events.game_starting.call(null);
        this.events.game_crash(json);
        this.events.game_ended(json);

        this.lastGame = json;

        let result = 'Lose'.red;
        if (json.game_crash < this.lastRate) {
            // LOST
            this.losses += 1;
            if (this.winStreak > this.maxWinStreak) {
                this.maxWinStreak = this.winStreak;
            }
            this.winStreak = 0;
            this.lossStreak += 1;
        } else {
            //.Balancecconsole.log('Player won');
            this.balance += this.lastBet * (this.lastRate/100)
            result = 'Win '.green;
            this.wins += 1;
            if (this.lossStreak > this.maxLossStreak) {
                this.maxLossStreak = this.lossStreak;
            }
            this.lossStreak = 0;
            this.winStreak += 1;
        }
        if (this.balance < 0) {
            throw OutOfCashException;
        }
        if (this.balance < this.minBalance) {
            this.minBalance = this.balance;
        }
        if (this.balance > this.maxBalance) {
            this.maxBalance = this.balance;
        }
        let profit = this.balance - startBalance;
        this.totalProfit += profit;
        if (profit > 0) {
            profit = (profit/100)+"".green;
        } else {
            profit = (profit/100)+"".red;
        }
        console.log(`Game ${json.game_id} - Crash ${parseFloat(json.game_crash/100).toFixed(2).blue}% - ${result} - start_balance: ${startBalance/100} - bet: ${this.lastBet/100} - rate: ${this.lastRate/100}% - end_balance: ${this.balance/100} - Profit: ${profit}`)
    }

    handleEnd() {
        console.log(`EndBalance: ${this.balance/100} - MaxBalance: ${this.maxBalance/100} - MinBalance: ${this.minBalance/100} - Total profit: ${this.totalProfit/100}`);
        console.log(`Wins ${this.wins} - Losses ${this.losses} - MaxWinStreak: ${this.maxWinStreak} - MaxLossStreak ${this.maxLossStreak}`);
    }

    getBalance() {
        return this.balance;
    }
}

const engine = new Engine(100000);

engine.run();
