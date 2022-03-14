const MemoryStorage = require('memorystorage');
const store = new MemoryStorage('details-tab-app');

// store.setItem("partList", [
//     { personName: "Fabian", votes: 1 },
//     { personName: "Föreningen", votes: 3 },
//     { personName: "New person", votes: 0 },
//     { personName: "Person that left", votes: -1 },
//     { personName: "Company", votes: 1 },
//     { personName: "Person", votes: 1 },]);
// store.setItem("agendaList", [
//     {
//         title: "First vote",
//         option1: "Yes",
//         option2: "No",
//         maxVotes: 7,
//         Id: "14",
//         IsSend: true,
//         personAnswered: {
//             Yes: ["Fa", "Bi"],
//             No: ["St", "oc", "kh"]
//         }
//     },
//     {
//         title: "A prepared vote",
//         option1: "Yes",
//         option2: "No",
//         Id: "15",
//         IsSend: false
//     }]);
module.exports = store