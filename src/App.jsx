import { useState, useEffect, useRef } from 'react';
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



function App() {

  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [logtranscript, setLogTranscript] = useState("");
  const messagesEndRef = useRef(null);

  const backendUrl =import.meta.env.VITE_BACKEND_URL;
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  function redirectTo(url) {
    if (url) {
        setTimeout(() => {
          window.open(url, '_blank'); // Opens the URL in a new tab

        }, 600);
    } else {
        console.error("Invalid URL provided");
    }
  }

  useEffect(() => {
    const synth = window.speechSynthesis || window.webkitSpeechSynthesis;
    const updateVoices = () => {
      const availableVoices = synth.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(availableVoices[5]);
      }
    };
    
    updateVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = updateVoices;
    }
  }, [selectedVoice]);
  const speak = (inputText) => {
    if (!inputText) return;
    const synth = window.speechSynthesis || window.webkitSpeechSynthesis;
    const utterance = new SpeechSynthesisUtterance(inputText);
    utterance.voice = selectedVoice;
    synth.speak(utterance);
  };

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


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);



  const getWeather = async ( logtranscript) => {
    axios.get(`${backendUrl}/getWeather?lat=${lat}&lon=${lon}`)
      .then(async (response) => {
        console.log(response)
        await axios.post(
          `${backendUrl}/getGemini`, // Gemini Pro model endpoint
          {
             text: logtranscript + JSON.stringify(response.data)
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
               text:  logtranscript + `<|user| : ${transcript} >` 
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
          getWeather(logtranscript)
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
    if(sender=="assistant"){
      speak(text)
    }
  };

  return (
    <Container maxWidth="sm">

<select
        onChange={(e) => setSelectedVoice(voices.find(voice => voice.name === e.target.value))}
        className="border p-2 rounded w-full"
      >
        {voices.map((voice, index) => (
          <option key={index} value={voice.name}>{voice.name} ({voice.lang})</option>
        ))}
      </select>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Sirixa Voice Assistant
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
                    secondary={message.sender === 'user' ? 'You' : 'Sirixa'}
                    ref={messagesEndRef}
                  />
                </Paper>
              </ListItem>
            ))}
          </List >
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
