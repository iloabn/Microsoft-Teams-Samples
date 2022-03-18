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
      console.log("START");
      console.log(JSON.stringify(context.activity));

      console.log("2");

      const client = new ConnectorClient(credentials, {
        baseUri: context.activity.serviceUrl,
      });
      const members = await client.conversations.getConversationMembers(
        context.activity.conversation.id
      );
      console.log("3");
      console.log(JSON.stringify(members));

      console.log("4");

      const newPartList = members.map((part) => {
        return { id: part.id, personName: part.name, votes: 0 };
      });

      console.log("5");

      if (context.activity.membersAdded) {
        const addedMembers = newPartList.filter((x) =>
          context.activity.membersAdded.find((m) => m.id === x.id)
        );

        const tableClient = TableClient.fromConnectionString(
          process.env.TABLE_CONNECTION_STRING,
          "voters"
        );
        const newVoters = newPartList.map(
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
            await tableClient.createEntity(voter);
            console.log("ADDED:");
          } catch (error) {
            console.log("ERROR ADDING: ", error);
          }
        }
      }

      if (context.activity.membersRemoved) {
        // const removedMembers = currentPartList.filter(x => context.activity.membersRemoved.find(m => m.id === x.id))
        //     .map((removed) => { removed.votes = -1; return removed; });
        console.log(
          "REMOVED: ",
          JSON.stringify(context.activity.membersRemoved)
        );
        // currentPartList = [...currentPartList.filter(x => !context.activity.membersRemoved.find(m => m.id === x.id)), ...removedMembers];
      }

      /**
       * [{"id":"29:1hWH7TXQEbNDxR2n0CVDDIimfWX0yS4wrArQAM279NENfxyOkRrWcA6sjOFvUFtpnyDg3DPUC-5pmQZ4knB5gfg","name":"Fabian Miiro","objectId":"51a7c595-4695-4e42-bdce-0103141d1ccf","givenName":"Fabian","surname":"Miiro","email":"fabian.miiro@stockholmpride.org","userPrincipalName":"fabian.miiro@stockholmpride.org","tenantId":"f06e04fb-560b-4235-a626-0d4b87a472b3","userRole":"user"},{"id":"29:1_WId0404nVw7sL8XKjYSd8omxTLDY4eZBApW9NptwkjhN77HqxjWmXnqAqP957Wr6VITNfNbrRg2H4vWPQeUUA","name":"Someone else (Guest)","tenantId":"f06e04fb-560b-4235-a626-0d4b87a472b3","userRole":"anonymous"}]
       */
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

      await voteTableClient.upsertEntity({
        partitionKey: conId,
        rowKey: data.Choice,
        person: personId,
        votes: (await personTableClient.getEntity(conId, personId)).votes
      });

      console.log("Activity value ", JSON.stringify(context.activity));
      console.log("User: ", context.activity.from);
      console.log("Reply to: ", context.activity.replyToId);

      //// FIX THIS SO THAT A RESULT POST IS POSTED
    //   const card = createAdaptiveCard(
    //     "Result.json",
    //     taskInfo,
    //     percentOption1,
    //     percentOption2
    //   );

    //   const previousActivityId = store.getItem("lastActivityId");
    //   console.log(previousActivityId);
    //   if (previousActivityId) {
    //     const message = MessageFactory.attachment(card);
    //     message.id = previousActivityId;
    //     await context.updateActivity(message);
    //   } else {
    //     const result = await context.sendActivity({ attachments: [card] });
    //     store.setItem("lastActivityId", result.id);
    //   }
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
