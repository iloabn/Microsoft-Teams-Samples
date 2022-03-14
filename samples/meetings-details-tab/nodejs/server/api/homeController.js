const configuration = require('dotenv').config();
const store = require('../services/store')
const { createAdaptiveCard } = require('../services/AdaptiveCardService')
const { ConnectorClient, MicrosoftAppCredentials } = require('botframework-connector');
const { TableServiceClient } = require("@azure/data-tables");
const credentials = new MicrosoftAppCredentials(process.env.BotId, process.env.BotPassword);

const sendAgenda = async (req) => {
  const data = req.body;

  const taskInfo = data.taskInfo;
  const partList = store.getItem("partList");
  taskInfo.maxVotes = partList.reduce((total, part) => total + part.votes, 0)

  console.log("DATA: ", data);

  data.taskList.find(x => x.id == taskInfo.id).maxVotes = taskInfo.maxVotes;

  const conversationID = store.getItem("conversationId");
  const serviceUrl = store.getItem("serviceUrl");
  console.log("SERVICE URL: ", serviceUrl);
  console.log("CONVERSATION ID: ", serviceUrl);
  const client = new ConnectorClient(credentials, { baseUri: serviceUrl });
  const adaptiveCard = createAdaptiveCard('Poll.json', data.taskInfo)
  try {
    MicrosoftAppCredentials.trustServiceUrl(serviceUrl);
    await client.conversations.sendToConversation(conversationID,
      {
        type: 'message',
        from: { id: process.env.BotId },
        attachments: [adaptiveCard]
      });
  }
  catch (e) {
    console.log(e.message);
  }
}
const getAgendaList = async (req, res) => {
  await res.send(store.getItem("agendaList"));
}
const setAgendaList = async (req, res) => {
  store.setItem("agendaList", req.body);
}

const getPartList = async (req, res) => {
  const currentPartyList = store.getItem("partList");
  // console.log("GOT PARTY LIST: ", currentPartyList);
  await res.send(currentPartyList);

};
const setPartList = async (req, res) => {
  console.log(JSON.stringify(req.body));
  console.log("Trying to save a new value");
  const partyList = store.getItem("partList");
  const indexOfParty = partyList.findIndex((x) => x.id == req.body.id);
  partyList[indexOfParty].votes = req.body.votes;

  console.log(JSON.stringify(partyList));
  store.setItem("partList", partyList);
  res.status(200).end();
};

module.exports = {
  sendAgenda,
  getAgendaList,
  setAgendaList,
  getPartList,
  setPartList
}