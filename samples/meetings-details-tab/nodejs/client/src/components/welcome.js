import * as microsoftTeams from "@microsoft/teams-js";
import React,{useState, useEffect} from "react";
import Agenda from './Agenda';
import Party from './Party';
import {v4 as uuidv4  } from "uuid";

function Welcome (){
    const [agendaList, setAgenda]= useState([]);
    const [partList, setPartList] = useState([]);

    const loadPartList = async () => {
        const response = await fetch("/api/getPartList", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const textData = await response.text();
        if(textData.length) {
            const data = JSON.parse(textData);
            setPartList(data);
        }
    }

    useEffect(() => {
        const loadAgenda = async () => {
            const response = await fetch("/api/getAgendaList", {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                  }
            });
            const textData = await response.text();
            if(textData.length){
              const data = JSON.parse(textData);  
            setAgenda(data);
            }
        };
        loadAgenda();
        console.log("AGENDA LOADED")
        loadPartList();
        const comInterval = setInterval(loadPartList, 10 * 1000);
        return () => clearInterval(comInterval)
    }, []);

    const setAgendaList = (list) => {
        fetch("/api/setAgendaList", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
              },
            body: JSON.stringify(list),
        })
    }
    microsoftTeams.initialize();
     const submitHandler = (err, result) => {
         if(!result || !result.title || !result.option1 || !result.option2)
                return ;
        const taskInfo = {...result, Id: uuidv4()}
        const list = [...agendaList, taskInfo];
        setAgenda(list);
        setAgendaList(list);
        };
    const openTaskModule = () => {
        const baseUrl = `https://${window.location.hostname}:${window.location.port}`;
        let taskInfo = {
            title: null,
            height: null,
            width: null,
            url: null,
            card: null,
            fallbackUrl: null,
            completionBotId: null,
        };
            taskInfo.url = baseUrl +"/Detail";
            taskInfo.title = "Add a Poll";
            taskInfo.height = "250";
            taskInfo.width = "500";
            taskInfo.fallbackUrl = taskInfo.url
        microsoftTeams.tasks.startTask(taskInfo, submitHandler);
    }
    
    return (
        <>
        <h1>Välkommen rösträknare!</h1>
        <div>
            <button type="button" id="btnAddAgenda" class="btn btn-outline-info" onClick={() => openTaskModule()}>Skapa ny röstning</button>
            {
               agendaList && agendaList.map(x=> <Agenda {...x} taskList = {agendaList}/>)
            }
            {
                partList && partList.map(x => <Party {...x} partyList={partList}/>)
            }
        </div>
        </>
    )
}

export default Welcome