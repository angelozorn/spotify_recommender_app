const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');

const app = express();
const port = 80;

// Configure Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: 'b00fa2c9d6674dc389b320778744472a',
  clientSecret: '43b4bfc8c0c241d4a503c221b5ac7ea6',
  redirectUri: `http://edmspotifyrecommender.com`
});

// Serve static files
app.use(express.static('public'));

// Login page route
app.get('/', (req, res) => {
  const authorizeURL = spotifyApi.createAuthorizeURL(['user-read-private', 'user-read-email', 'user-top-read'], 'state');
  res.send(`
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #000000;
      color: #ffffff;
      text-align: center;
      margin-top: 50px;
    }

    a {
      display: inline-block;
      padding: 10px 20px;
      background-color: #1db954;
      color: #ffffff;
      text-decoration: none;
      border-radius: 40px;
      font-weight: bold;
      border: none;
    }

    a:hover {
      background-color: #1ed760;
    }
  </style>

  <h1>Welcome to My Spotify App</h1>
  <a href="${authorizeURL}">Login with Spotify</a>
  `);
});

app.get('/callback', async (req, res) => {
    const { code } = req.query;
  
    try {
      const data = await spotifyApi.authorizationCodeGrant(code);
      const { access_token, refresh_token } = data.body;
  
      // Set the access token on the API object
      spotifyApi.setAccessToken(access_token);
      spotifyApi.setRefreshToken(refresh_token);
      console.log('Access token set:', spotifyApi.getAccessToken());
  
      // Fetch user's profile information
      const user = await spotifyApi.getMe();
      const { display_name, images } = user.body;
  
      // Render the form with buttons for term selection and user's profile information
      let html = `
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #000000;
          color: #ffffff;
          text-align: center;
          margin-top: 50px;
        }
  
        button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #1db954;
          color: #ffffff;
          text-decoration: none;
          border-radius: 40px;
          font-weight: bold;
          border: none;
        }
  
        button:hover {
          background-color: #1ed760;
        }
  
        #profile {
          margin-top: 20px;
        }
  
        #profile img {
          border-radius: 50%;
          width: 100px;
          height: 100px;
        }
  
        #profile p {
          margin-top: 10px;
          font-size: 18px;
        }
      </style>
  
      <h1>Welcome to My Spotify App</h1>
      <div id="profile">
        <img src="${images[0].url}" alt="Profile Picture">
        <p>Welcome, ${display_name}!</p>
        <p>Please choose a time period:</p>
      </div>
  
      <form action="/top-tracks" method="GET">
        <button type="submit" name="time_range" value="short_term">1 Month</button>
        <button type="submit" name="time_range" value="medium_term">1 Year</button>
        <button type="submit" name="time_range" value="long_term">Several Years</button>
      </form>
      `;
  
      res.send(html);
    } catch (error) {
      console.log('Error:', error);
      res.send('Error occurred while logging in.');
    }
  });
  
  let currentlyPlayingTrack = null;

  app.get('/top-tracks', async (req, res) => {
    const { time_range, min_bpm, max_bpm } = req.query;
    
    try {
        const user = await spotifyApi.getMe();
    const { display_name, images } = user.body;
      // Retrieve the user's top tracks based on the selected time range
      const topTracksData = await spotifyApi.getMyTopTracks({
        time_range,
        limit: 10
      });
  
      const topTracks = topTracksData.body.items;
  
      // Extract track IDs from the top tracks
      const trackIds = topTracks.map((track) => track.id);
  
      // Get recommendations based on the track IDs
      const recommendationsData = await spotifyApi.getRecommendations({
        seed_tracks: trackIds.slice(0, 5), // Use the first 5 track IDs as seeds
        limit: 10, // Get 5 recommendations
        min_tempo: min_bpm,
        max_tempo: max_bpm,
      });
  
      const recommendations = recommendationsData.body.tracks;
  
      const trackBpmPromises = topTracks.map((track) =>
      spotifyApi.getAudioFeaturesForTrack(track.id)
    );
    const trackBpmData = await Promise.all(trackBpmPromises);
    const trackBpms = trackBpmData.map((track) => track.body.tempo);

    const recommendedTrackBpmPromises = recommendations.map((track) =>
      spotifyApi.getAudioFeaturesForTrack(track.id)
    );
    const recommendedTrackBpmData = await Promise.all(recommendedTrackBpmPromises);
    const recommendedTrackBpms = recommendedTrackBpmData.map((track) => track.body.tempo);  


      // Render the form with buttons for term selection and user's profile information
      let html = `
      <style>

      li a {
        display: inline-block;
        padding: 8px 16px;
        background-color: #1db954;
        color: #ffffff; /* Update the font color to white */
        text-decoration: none;
        border-radius: 40px;
        font-weight: bold;
        border: none;
      }
    
      li a:hover {
        background-color: #1ed760;
      }
        body {
          font-family: Arial, sans-serif;
          background-color: #000000;
          color: #ffffff;
          text-align: center;
          margin-top: 50px;
        }

        #profile {
            margin-top: 20px;
          }
    
          #profile img {
            border-radius: 50%;
            width: 100px;
            height: 100px;
          }
    
          #profile p {
            margin-top: 10px;
            font-size: 18px;
          }
  
        h1 {
          margin-top: 20px;
          
          color: #ffffff;
        }

        button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #1db954;
            color: #ffffff;
            text-decoration: none;
            border-radius: 40px;
            font-weight: bold;
            border: none;
          }
    
          button:hover {
            background-color: #1ed760;
          }
  
        .container {
          display: flex;
          justify-content: center;
        }
  
        .top-tracks,
        .recommended-tracks {
          width: 50%;
        }
  
        .bar {
          width: 2px;
          background-color: #ffffff;
          margin: 0 20px;
        }
  
        ul {
          list-style-type: none;
          padding: 0;
          margin-top: 20px;
        }
  
        li {
          margin-bottom: 10px;
          
          color: #ffffff;
        }
  
        iframe {
          margin-top: 10px;
          margin-bottom: 10px;
        }
        .filter-form {
          display: inline-block;
          
        }
        
  
        /* CSS styling for specific words */
        .highlight {
          color: #1db954;
          font-weight: bold;
        }
      </style>
      
      
      <div id="profile">
      <img src="${images[0].url}" alt="Profile Picture">
      <p>Welcome, ${display_name}!</p>
      <p>Use this Spotify API application to see your top 10 tracks over different time periods and get recommended tracks of different genres:</p>
    </div>
  
      
  
      <div class="container">
      <div class="recommended-tracks">
      <h1>Change the time period:</h1>
      
        
        <form action="/top-tracks" method="GET" class="filter-form">
        <button type="submit" name="time_range" value="short_term">1 Month</button>
        <button type="submit" name="time_range" value="medium_term">1 Year</button>
        <button type="submit" name="time_range" value="long_term">Several Years</button>
      </form>
      
          <h2 id="term1"></h2>
          <script>
          var term1 = "${time_range.replace('_', ' ').toUpperCase()}";
          var term1Element = document.getElementById('term1');
    
          if (term1 === "SHORT TERM") {
            term1Element.innerHTML = 'Top 10 Tracks: past 1 Month';
          } else if (term1 === "MEDIUM TERM") {
            term1Element.innerHTML = 'Top 10 Tracks: past 1 Year';
          } else if (term1 === "LONG TERM") {
            term1Element.innerHTML = 'Top 10 Tracks: past Several Years';
          }
        </script>

          <ul>
      `;
  
      topTracks.forEach((track, index) => {
        const rankingNumber = index + 1;
        html += `
        <li>${rankingNumber}. <span class="highlight">${track.name}</span> by <span class="highlight">${track.artists[0].name}   </span> <a href="${track.external_urls.spotify}" target="_blank">Play on Spotify</a></li>
        <iframe src="https://open.spotify.com/embed/track/${track.id}" width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
        `;
      });
  
      html += `
          </ul>
        </div>
  
        <div class="bar"></div>
  
        <div class="recommended-tracks">

        <div>
      <h1>Recommendation Genre:</h1>
      <form action="/top-tracks" method="GET" class="filter-form">
      <input type="hidden" name="time_range" value="${time_range}">
      <input type="hidden" name="min_bpm" placeholder="Min BPM" value="1">
      <input type="hidden" name="max_bpm" placeholder="Max BPM" value="250">
      <button type="submit">All</button>
    </form>
      <form action="/top-tracks" method="GET" class="filter-form">
      <input type="hidden" name="time_range" value="${time_range}">
      <input type="hidden" name="min_bpm" placeholder="Min BPM" value="120">
      <input type="hidden" name="max_bpm" placeholder="Max BPM" value="128">
      <button type="submit">House</button>
    </form>
    <form action="/top-tracks" method="GET" class="filter-form">
      <input type="hidden" name="time_range" value="${time_range}">
      <input type="hidden" name="min_bpm" placeholder="Min BPM" value="140">
      <input type="hidden" name="max_bpm" placeholder="Max BPM" value="160">
      <button type="submit">Bass</button>
    </form>
    <form action="/top-tracks" method="GET" class="filter-form">
      <input type="hidden" name="time_range" value="${time_range}">
      <input type="hidden" name="min_bpm" placeholder="Min BPM" value="170">
      <input type="hidden" name="max_bpm" placeholder="Max BPM" value="178">
      <button type="submit">Drum & Bass</button>
    </form>
    </div>


          <h2>Recommended Tracks:</h2>
          <ul>
      `;
  
    


      recommendations.forEach((track, index) => {
        const rankingNumber = index + 1;
        html += `
        <li>${rankingNumber}. <span class="highlight">${track.name}</span> by <span class="highlight">${track.artists[0].name}  </span> <a href="${track.external_urls.spotify}" target="_blank">Play on Spotify</a> </li>
        <iframe src="https://open.spotify.com/embed/track/${track.id}" width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
        `;
      });
  
      html += `
          </ul>
        </div>
      </div>
      `;
  
      res.send(html);
    } catch (error) {
      console.log('Error:', error);
  console.log('Error message:', error.message);
  console.log('Error status code:', error.statusCode);
      res.send('Error occurred while retrieving top tracks.');
    }
  });
  
  
  

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

