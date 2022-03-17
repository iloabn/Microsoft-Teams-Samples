import * as microsoftTeams from "@microsoft/teams-js";
const Config = () => {
    const baseUrl = `https://${window.location.hostname}:${window.location.port}`;
    microsoftTeams.initialize();
    microsoftTeams.settings.registerOnSaveHandler((saveEvent) => {
        microsoftTeams.settings.setSettings({
            contentUrl: baseUrl + "/",
            entityId: "DetailsTab",
            suggestedDisplayName: "Röstning",
            websiteUrl: baseUrl + "/",
        });
        saveEvent.notifySuccess();
    });
microsoftTeams.settings.setValidityState(true);
return (
    <div>
        <div style={{display: "flex", FontSize: 18}}>Tryck på spara för att installera röstning-modulen.</div>
        <p>You are running this application in <b>{process.env.NODE_ENV}</b> mode</p>
    </div>
)
};
export default Config;