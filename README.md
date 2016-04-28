# flightstream
FSX&amp;P3D nodecg bundle


**Requirements:**

- websimconnect (http://websimconnect.webs.com/)
- nodecg (https://github.com/nodecg/nodecg)


**Installation**

- Install NodeCG, make sure it is running
- Extract the WebSimConnect folder from the WebSimConnect ZIP file to your NodeCG project folder
- Install the FlightStream overlay
''
cd <your nodecg folder>
npm install -g nodecg-cli
nodecg install 3dot/flightstream
cd bundles/flightstream
nodecg defaultconfig
''
- Run NodeCG
''
nodecg start
''
- Go to your NodeCG browser page and make sure the Admin panel for FlightStream is showing up
- Use the graphics/flightstream page as your layer in OBS or other streaming software that supports web pages with the following CSS settings
''
body {
  background-color: rgba(0, 0, 0, 0);
  margin: 0px auto;
  overflow: hidden;
}
''

**Support**
In case of issues, use the issues tab on GitHub or send a message via Twitter (https://twitter.com/bisequeplay)