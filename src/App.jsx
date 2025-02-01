import { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  IconButton, 
  Typography, 
  Box,
  List,
  ListItem,
  ListItemText 
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import axios from 'axios';
import './App.css';
import context from './Context.js';



function App() {

  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [logtranscript, setLogTranscript] = useState("");

  const backendUrl =import.meta.env.VITE_BACKEND_URL;
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  // const context =
  // "You are an AI responding to the commands of a user attempting to issue commands to a program via voice, you will be given commands through this text right after the word ENDOFCONTEXT is written. The parts after the word are to be treated as user commands. Only the last part written after <|user|> is the current command to  be answered to. For all user commands a json result needs to be output. For commands such as open youtube, you will need to output a json with commandid =1, and url= the url of the website which you can guess as well as a message which is whatever you want to answer, include the http:// in the beginning of the url, if the website is not recognizable just treat it as an invalid command but say in the message that you do not recognize the website. For any commands like describe me the weather, if they do not accompany a weather data json, return a message saying fetching the weather data with command id 2, and if it does come with the weather data, return a message describing the weather data json with command id 0. For any command that is fulfillable by text you may answer they directly as they would be by a default llm in the message field and set the command id to 10, treat it as a valid command and output a valid message, for example write me a song, you can output a song, or tell me a story you can generate a story and send it in the message and so on. For any conversational message input, return with a conversational message and commandid 0. For any command that is not a valid command and not conversational return commandid 0 and a message that says something like this is not a valid command, please enter a valid command, you can be a bit more playful or different with this command rejection as you prefer. ENDOFCONTEXT\n";

  const [error, setError] = useState('');
  function redirectTo(url) {
    if (url) {
        window.open(url, '_blank'); // Opens the URL in a new tab
    } else {
        console.error("Invalid URL provided");
    }
  }

  const getLocation = async () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(function (position) {
        setLat(position.coords.latitude)
        setLon(position.coords.longitude,)
      });
    } else {
      console.log("Geolocation is not available in your browser.");
    }
  }
  useEffect(() => {
    getLocation();
  }, []);




  const getWeather = async (context, logtranscript) => {
    axios.get(`${backendUrl}/getWeather?lat=${lat}&lon=${lon}&appid=${openWeatherApikey}`)
      .then(async (response) => {
        console.log(response)
        await axios.post(
          `${backendUrl}/getGemini`, // Gemini Pro model endpoint
          {
             text: context+logtranscript + JSON.stringify(response.data)
             } // Gemini API request format
          ,
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        ).then(

          (weatherresponse)=>{
            const weatherresponseText = weatherresponse.data.candidates[0].content.parts[0].text;
            const weatherjsonObject = JSON.parse(weatherresponseText.replace("```json\n","").replace("```","").replace("commandId","commandid").replace("\n",""));
            addMessage('assistant', weatherjsonObject.message);

          }
        )
        console.log(response)
        // setLoading(false);
      })
      .catch((error) => {
        console.log(error)
        // setError(error);
        // setLoading(false);
      });
  }

  const startListening = () => {
    setError('');
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.lang = 'en-US';
  
    recognition.onstart = () => {
      setIsListening(true);
    };


    recognition.onresult = async (event) => {
      var curConv = "";
      const transcript = event.results[0][0].transcript;
      addMessage('user', transcript);
  

      try {
        const response = await axios.post(
          `${backendUrl}/getGemini`, // Gemini Pro model endpoint
          {
               text: context + logtranscript + `<|user| : ${transcript} >` 
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
  
        // Gemini API response structure is different
        const responseText = response.data.candidates[0].content.parts[0].text;
        const jsonObject = JSON.parse(responseText.replace("```json\n","").replace("```json","").replace("```","").replace("commandId","commandid").replace(/\n/g, ""));

        console.log(responseText.replace("```json\n","").replace("```json","").replace("```","").replace("commandId","commandid"));

        console.log(responseText);
        addMessage('assistant', jsonObject.message);
        setLogTranscript(logtranscript + `<|user| : ${transcript} >`+ `<|assistant| : ${jsonObject.message} >`)

        if(jsonObject.commandid==1){
          redirectTo(jsonObject.url)
        }

        if(jsonObject.commandid == 2){
          getWeather(context,logtranscript)
        }

      } catch (err) {
        setError('Error processing your request');
        console.error('Error:', err);
      }
    };
  
    recognition.onerror = (event) => {
      setError('Error: ' + event.error);
      setIsListening(false);
    };
  
    recognition.onend = () => {
      setIsListening(false);
    };
  
    recognition.start();
  };
  const stopListening = () => {
    setIsListening(false);
    window.speechRecognition?.stop();
  };

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text, timestamp: new Date() }]);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Amigo Voice Assistant
        </Typography>
        
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            height: '60vh', 
            overflow: 'auto',
            mb: 2,
            backgroundColor: '#f5f5f5'
          }}
        >
          <List>
            {messages.map((message, index) => (
              <ListItem 
                key={index}
                sx={{
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Paper
                  sx={{
                    p: 1,
                    backgroundColor: message.sender === 'user' ? '#e3f2fd' : '#fff',
                    maxWidth: '80%'
                  }}
                >
                  <ListItemText 
                    primary={message.text}
                    secondary={message.sender === 'user' ? 'You' : 'Amigo'}
                  />
                </Paper>
              </ListItem>
            ))}
          </List>
        </Paper>

        {error && (
          <Typography color="error" align="center" gutterBottom>
            {error}
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <IconButton 
            color={isListening ? 'secondary' : 'primary'}
            size="large"
            onClick={isListening ? stopListening : startListening}
            sx={{ 
              width: 80, 
              height: 80,
              border: '2px solid',
              borderColor: isListening ? 'secondary.main' : 'primary.main'
            }}
          >
            {isListening ? <StopIcon /> : <MicIcon />}
          </IconButton>
        </Box>
      </Box>
    </Container>
  );
}

export default App;
