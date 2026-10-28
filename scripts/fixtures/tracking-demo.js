// Synthetische Demo — keine SAP API
const preferences = { consent: true, channel: "web", audience: "demo-segment" };
function canShowExperience() {
  return preferences.consent;
}
console.log(canShowExperience());
