export const spend = async (state) => {
    console.log("\n");
    const a = await getOneOf('Spend a potato to send an orc away (y/N)?', ['Y','N', "\n"]);
    if (a.toUpperCase() === 'Q') {
        process.exit(0);
    }
    if (a.toUpperCase() !== 'N') {
        state.p--;
        state.o--;
        if (state.o > 0 && state.p > 0 && state.p < 10) {
            return spend(state);
        }
    }
};
