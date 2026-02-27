# Church Music System

## Overview
The Church Music System is a web application designed to manage songs and repertoires for Christian churches. It provides a user-friendly interface for managing music content, allowing users to create, edit, and organize songs and repertoires efficiently.

## Features
- **User Authentication**: Secure login and registration using email and password with Supabase authentication.
- **Song Management**: Admin users can create, read, update, and delete songs.
- **Repertoire Management**: Users can create and manage repertoires, assigning songs to specific repertoires.
- **Mobile-First Design**: The application is optimized for mobile devices, ensuring a seamless experience across all screen sizes.
- **PNG Export**: Functionality to export song and repertoire details as PNG images for easy sharing and printing.

## Technologies Used
- **Frontend**: HTML5, CSS3, Bootstrap 5, JavaScript ES6
- **Backend**: Supabase (PostgreSQL database + Authentication)
- **Libraries**: Supabase JS SDK, html2canvas for PNG export

## Project Structure
```
church-music-system
├── public
│   └── index.html
├── src
│   ├── styles
│   │   ├── mobile.css
│   │   └── main.css
│   ├── js
│   │   ├── app.js
│   │   ├── router.js
│   │   ├── services
│   │   │   ├── supabaseClient.js
│   │   │   └── exportPng.js
│   │   ├── auth
│   │   │   ├── auth.js
│   │   │   └── auth-ui.js
│   │   ├── modules
│   │   │   ├── songs
│   │   │   │   ├── songs.js
│   │   │   │   └── songs-ui.js
│   │   │   └── repertoire
│   │   │       ├── repertoire.js
│   │   │       └── repertoire-ui.js
│   │   └── utils
│   │       └── validators.js
│   └── templates
│       ├── song-item.html
│       └── repertoire-item.html
├── supabase
│   ├── schema.sql
│   ├── policies.sql
│   ├── seed.sql
│   └── migrations
│       └── 001_init.sql
├── api
│   └── webhook
│       └── index.js
├── .env.example
├── package.json
├── .gitignore
├── README.md
└── LICENSE
```

## Setup Instructions
1. **Clone the Repository**: 
   ```
   git clone <repository-url>
   cd church-music-system
   ```

2. **Install Dependencies**: 
   ```
   npm install
   ```

3. **Configure Environment Variables**: 
   Rename `.env.example` to `.env` and fill in your Supabase Project URL and anon public key.

4. **Run the Application**: 
   ```
   npm start
   ```

5. **Access the Application**: Open your browser and navigate to `http://localhost:3000`.

## Usage
- **Authentication**: Users can register and log in to access the application.
- **Managing Songs**: Admins can add new songs, edit existing ones, and delete songs as needed.
- **Managing Repertoires**: Users can create repertoires and assign songs to them for organized worship sessions.
- **Exporting to PNG**: Use the export functionality to save song and repertoire details as PNG images.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.# Adoradores-del-Rey
