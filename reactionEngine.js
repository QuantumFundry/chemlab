/**
 * findReaction
 * Matches two selected substances against the reactions database and
 * returns the full reaction object, or null if nothing happens.
 *
 * Order doesn't matter: findReaction("H2O", "Na", data) works the same
 * as findReaction("Na", "H2O", data).
 *
 * @param {string} reactantA - symbol/formula of the first substance, e.g. "Na"
 * @param {string} reactantB - symbol/formula of the second substance, e.g. "H2O"
 * @param {Array} reactionsData - the parsed contents of reactions.json
 * @returns {Object|null} the matching reaction object, or null
 */
function findReaction(reactantA, reactantB, reactionsData) {
  if (!reactantA || !reactantB || !Array.isArray(reactionsData)) {
    return null;
  }

  // Normalize so "na", "Na", " Na " all match the same way
  const normalize = (s) => s.trim().toLowerCase();
  const a = normalize(reactantA);
  const b = normalize(reactantB);

  const match = reactionsData.find((reaction) => {
    if (!Array.isArray(reaction.reactants) || reaction.reactants.length !== 2) {
      return false;
    }
    const [r1, r2] = reaction.reactants.map(normalize);

    // Check both orderings: (a,b) or (b,a)
    return (r1 === a && r2 === b) || (r1 === b && r2 === a);
  });

  return match || null;
}

/**
 * Optional helper: some reactions (washing soda, plaster of paris) need
 * "heat" as the second input rather than a chemical. Use this to check
 * if a substance has a heat-triggered reaction before offering a flame
 * icon in the UI.
 *
 * @param {string} substance
 * @param {Array} reactionsData
 * @returns {Object|null}
 */
function findHeatReaction(substance, reactionsData) {
  return findReaction(substance, "heat", reactionsData);
}

// Example usage:
// const reactions = await fetch("reactions.json").then(r => r.json());
// const result = findReaction("Mg", "O2", reactions);
// if (result) {
//   console.log(result.equation);   // "2Mg + O2 -> 2MgO"
//   console.log(result.why);        // explanation text
// } else {
//   console.log("No reaction occurs between these substances.");
// }

export { findReaction, findHeatReaction };
