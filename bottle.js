// Parses CSV of PIDs and get's persons vital stats and saves into json file
// Usage: node lookuppids.js

const neatCsv = require('neat-csv');
const fs = require('fs');
const fetch = require('node-fetch');
const Bottleneck = require("bottleneck/es5");

const limiter = new Bottleneck( { maxConcurrent: 1, minTime: 500 } );
const token = "114394cd-951a-40fc-ba09-173be6e47d0c-prod";

fs.readFile('byu/UT.csv', async (err, data) => {
	if (err) return console.error(err);

    let pids = await neatCsv(data);
    let persons = { people: []};

    for (let i = 0; i < pids.length; i++) {
        let url = 'https://api.familysearch.org/platform/tree/persons/'+pids[i].pid;

        limiter.schedule(() => fetch(url, { headers: { "Authorization": "Bearer "+token, "Accept": "Application/JSON" }}))
        .then(response => response.json())
        .then(json => {
            pids[i].name = json.persons[0].display.name;
            pids[i].lifespan = json.persons[0].display.lifespan;
            if (json.persons[0].display.birthDate) pids[i].bDate = json.persons[0].display.birthDate;
            if (json.persons[0].display.birthPlace) pids[i].bPlace = json.persons[0].display.birthPlace;
            if (json.persons[0].display.deathDate) pids[i].dDate = json.persons[0].display.deathDate;
            if (json.persons[0].display.deathPlace) pids[i].dPlace = json.persons[0].display.deathPlace;

            // Calc age
            if (json.persons[0].display.birthDate && json.persons[0].display.deathDate) {
                pids[i].age = parseInt((new Date(pids[i].dDate)- new Date(pids[i].bDate)) / (1000 * 60 * 60 * 24) / 365 | 0);
            } 

            (async () => {
                // Get death lat/lon
                if (pids[i].dPlace) {
                    await fetch('https://api.familysearch.org/platform/places/search?q=name:"'+pids[i].dPlace+'"', { headers: { "Authorization": "Bearer "+token, "Accept": "Application/JSON" }})
                    .then(response => response.json())
                    .then(json => {
                        pids[i].lat = json.entries[0].content.gedcomx.places[0].latitude;
                        pids[i].lon = json.entries[0].content.gedcomx.places[0].longitude;
                    });
                }

                console.log(pids[i].name, pids[i].age);
                persons.people.push(pids[i]);

                // save json file
                if (i == pids.length-1) fs.writeFileSync("people/UT.json", JSON.stringify(persons));
            })();
         });
    };
});