// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { TeamsActivityHandler, MessageFactory } = require("botbuilder");
const {
  ConnectorClient,
  MicrosoftAppCredentials,
} = require("botframework-connector");
const store = require("../services/store");
const { createAdaptiveCard } = require("../services/AdaptiveCardService");
const { TableClient } = require("@azure/data-tables");
const Voter = require("../models/Voter");
const credentials = new MicrosoftAppCredentials(
  process.env.BotId,
  process.env.BotPassword
);

class BotActivityHandler extends TeamsActivityHandler {
  constructor() {
    super();
    this.onConversationUpdate(async (context, next) => {
      console.log(JSON.stringify(context.activity));

      const client = new ConnectorClient(credentials, {
        baseUri: context.activity.serviceUrl,
      });
      const members = await client.conversations.getConversationMembers(
        context.activity.conversation.id
      );

      const newPartList = members.map((part) => {
        return { id: part.id, personName: part.name, votes: 0 };
      });

      if (context.activity.membersAdded) {
        const addedMembers = newPartList.filter((x) =>
          context.activity.membersAdded.find((m) => m.id === x.id)
        );

        console.log("ADDED MEMBERS: ", JSON.stringify(addedMembers));

        const tableClient = TableClient.fromConnectionString(
          process.env.TABLE_CONNECTION_STRING,
          "voters"
        );

        const existingVoters = newPartList.map(
          (x) =>
            new Voter(
              x.id,
              x.personName,
              x.votes,
              context.activity.conversation.id
            )
        );

        const newVoters = addedMembers.map(
          (x) =>
            new Voter(
              x.id,
              x.personName,
              x.votes,
              context.activity.conversation.id
            )
        );

        for (let voter of newVoters) {
          console.log("ADD ", voter.id);
          try {
            await tableClient.upsertEntity(voter);
            console.log("ADDED: ", voter.name);
          } catch (error) {
            console.log("ERROR ADDING: ", error);
          }
        }

        for (let voter of existingVoters) {
          try {
            await tableClient.createEntity(voter);
            console.log("ADDED: ", voter.name);
          } catch (error) {
            console.log("FAILED TO ADD: ", voter.name);
          }
        }
      }

      if (context.activity.membersRemoved) {
        console.log(
          "REMOVED: ",
          JSON.stringify(context.activity.membersRemoved)
        );

        const tableClient = TableClient.fromConnectionString(
          process.env.TABLE_CONNECTION_STRING,
          "voters"
        );

        for (const member of context.activity.membersRemoved) {
          await tableClient.upsertEntity({
            partitionKey: context.activity.conversation.id,
            rowKey: member.id,
            id: member.id,
            name: member.name,
            votes: -1
          });
        }
      }
    });

    this.onMessage(async (context, next) => {
      console.log("MESSAGE");
      const userName = context.activity.from.name;
      const data = context.activity.value;
      const answer = data.Feedback;
      const conId = context.activity.conversation.id;
      const personId = context.activity.from.id;

      const voteTableClient = TableClient.fromConnectionString(
        process.env.TABLE_CONNECTION_STRING,
        "votes"
      );

      const personTableClient = TableClient.fromConnectionString(
        process.env.TABLE_CONNECTION_STRING,
        "voters"
      );

      const questionTableClient = TableClient.fromConnectionString(
        process.env.TABLE_CONNECTION_STRING,
        "questions"
      );

      const currentQuestion = await questionTableClient.getEntity(conId, data.Choice);

      await voteTableClient.upsertEntity({
        partitionKey: data.Choice,
        rowKey: personId,
        selection: answer,
        votes: (await personTableClient.getEntity(conId, personId)).votes
      });

      const votesCursor = await voteTableClient.listEntities({
        queryOptions: {
          filter: `PartitionKey eq '${data.Choice}'`
        }
      });

      const votes = [];
      for await (const vote of votesCursor) {
        votes.push(vote);
      }
      console.log("DATA ", JSON.stringify(data));

      console.log("VOTES ", JSON.stringify(votes));

      const group = votes.reduce((acc, vote) => {
        const key = vote.selection;
        acc[key] += parseInt(vote.votes);
        return acc;
      }, { [currentQuestion.option1]: 0, [currentQuestion.option2]: 0 });

      console.log("GROUPS ", group);

      let cardTemplate = "Result.json";
      const maxVotes = parseInt(currentQuestion.maxVotes);
      if (group[currentQuestion.option1] > (maxVotes / 2) || group[currentQuestion.option2] > (maxVotes / 2)) {
        cardTemplate = "FinishedResult.json";
        await context.deleteActivity(currentQuestion.questionActivityId);
      }

      const card = createAdaptiveCard(
        cardTemplate,
        currentQuestion,
        (100 * group[currentQuestion.option1]) / maxVotes,
        (100 * group[currentQuestion.option2]) / maxVotes
      );

      if (currentQuestion.resultActivityId) {
        const message = MessageFactory.attachment(card);
        message.id = currentQuestion.resultActivityId;
        await context.updateActivity(message);
      } else {
        const result = await context.sendActivity({ attachments: [card] });
        console.log("CARD RESULT: ", JSON.stringify(result));
        currentQuestion.resultActivityId = result.id;
        await questionTableClient.upsertEntity(currentQuestion);
      }
    });
  }

  handleTeamsTaskModuleFetch(context, request) {
    const Id = request.data.Id;
    let taskInfo = {
      title: null,
      height: null,
      width: null,
      url: null,
      card: null,
      fallbackUrl: null,
      completionBotId: null,
    };
    taskInfo.url = process.env.BaseUrl + "/Result?id=" + Id;
    taskInfo.title = "Result";
    taskInfo.height = 250;
    taskInfo.width = 500;
    taskInfo.fallbackUrl = taskInfo.url;

    return {
      task: {
        type: "continue",
        value: taskInfo,
      },
    };
  }
}

module.exports.BotActivityHandler = BotActivityHandler;
