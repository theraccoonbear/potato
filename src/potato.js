import { spend as humanSpend } from './agents/human.js';
import fs from 'fs/promises';

const exists = async(file) => await fs.stat(file)
    .then(() => true)
    .catch(() => false);

(() => {
    let spend;
    let customAgent = false;

    const getAgent = async () => {
        if (process.argv.length > 2) {
            const name = process.argv[2];
            const path = `./agents/${name}.js`;
            const e = await exists(path);
            if (e) {
                const agent = await import(path);
                customAgent = true;
                return agent.spend;
            }
        }
        return humanSpend;
    };


    const weHave = {d:0,p:0,o:0,c:1,t:1};
    const itemKey = {d:'Destiny',o:'Orcs',p:'Potatoes',c:'Orc price'};
    const game = { 
        1: 'garden',
        2: 'garden',
        3: 'door',
        4: 'door',
        5: {c:1,m:'The world becomes a darker more dangerous place.'},
        6: {c:1,m:'The world becomes a darker more dangerous place.'},
        garden: {
            m: 'In the garden',
            1: {p:1,m:'you happily root about in your garden all day'},
            2: {p:1,d:1,m:'you narrowly avoid a visitor by hiding in a potato sack'},
            3: {d:1,o:1,m:'a hooded stranger lingers outside your farm'},
            4: {o:1,p:-1,m:'your field is ravaged in the night by unseen enemies'},
            5: {p:-1,m:'you trade potatoes for other delicious foodstuffs'},
            6: {p:2,m:'you burrow into a bumper crop of potatoes. Do you cry with joy? Possibly.'},
        },
        door: {
            m: 'A knock at the door',
            1: {o:1,m:'a distant cousin. They are after your potatoes. They may snitch on you.'},
            2: {d:1,m:'a dwarven stranger. You refuse them entry. ghastly creatures'},
            3: {d:1,o:1,m:'a wizard strolls by. You pointedly draw the curtains.'},
            4: {o:2,p:-1,m:'there are rumours of war in the reach. You eat some potatoes.'},
            5: {d:1,m:'it\'s an elf. They are not serious people.'},
            6: {p:2,m:'it\'s a sack of potatoes from a generous neighbor. you really must remeber to pay them a visit one of these years.'},
        }
    };

    const sleep = async (millis) => new Promise(resolve => setTimeout(resolve, millis));

    const roll = (sides) => Math.ceil(Math.random() * sides);

    const getOneOf = async (message, chars) => {
        console.log(message);
        const k = await getKeypress();
        return ['q', ...chars].map(c => c.toUpperCase()).includes(k.toUpperCase()) ? k : getOneOf(message, chars);
    };

    const anyKey = async () => {
        if (customAgent) { return; }
        console.log('\nPress any key to continue...');
        const res = await getKeypress();
        if (res.toUpperCase() === 'Q') { process.exit(0); }
    };
    const getKeypress = async () => {
        return new Promise(resolve => {
            const stdin = process.stdin
            const onData = (buffer) => {
                stdin.setRawMode(false);
                resolve(buffer.toString());
            };
            stdin.setRawMode(true); // so get each keypress
            stdin.resume(); // resume stdin in the parent process
            stdin.once('data', onData); // like on but removes listener also
        });
    };

    const show = (state) => console.log(`===[ GAME ]===\nTurn: ${state.t}\nPotatoes: ${state.p}/10\nDestiny: ${state.d}/10\nOrcs: ${state.o}/10\nOrc Price: ${state.c}\n==============`);

    const doGameEvent = async (event, options, state) => {
        const e = options[event];
        if (typeof e === 'string') {
            process.stdout.write(`${options[e].m}... `);
            if (!customAgent) { await sleep(500); }
            return doGameEvent(roll(6), options[e], state);
        }
        if (typeof e.m !== 'undefined') { console.log(e.m); }
        Object.keys(e)
            .forEach(k => {
                if (typeof e[k] !== 'undefined') { 
                    if (state[k] + e[k] >= 0) {
                        state[k] += e[k];
                        console.log(`${itemKey[k]} ${e[k] > 0 ? '+' : ''}${e[k]}`)
                    }
                }
            });
        show(state);
        if (!postTurnEvent(state)) { await anyKey(); }
    };

    const postTurnEvent = (state) => state.p >= 10 || state.d >= 10 || (state.o > 0 && state.p > 0);

    const processStep = async (options, state) => {
        const die = roll(6);
        console.clear();
        await doGameEvent(die, options, state);
        if (state.p >= 10) {
            console.log('You have enough potatoes to go underground and not return ton the surface until danger is past!');
            return true;
        } else if (state.d >= 10) {
            console.log(`An interfering ${Math.random() > 0.5 ? 'bard' : 'wizard'} turns up at your doorstep with a quest, and you are whisked away against your will on an adventure!`);
            return true;
        }
        if (state.o > 0 && state.p > 0) {
            await spend(state);
        }
        if (state.o >= 10) {
            console.log('The orcs finally find your potatoe farm.  Alas, orcs are not so interested in potatoes as they are in eating you, and you end up in cookpot!');
            return false;
        }
        state.t++;
        return processStep(options, state);
    };


    const run = async (gameData, have) => {
        spend = await getAgent();
        const state = {...have};
        const outcome = await processStep(gameData, state);
        console.log(outcome ? 'Success, you lived!' : 'Failure, you died!');
        process.exit(0);
    };

    run(game, weHave);
})();