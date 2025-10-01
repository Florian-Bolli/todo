# Minimal Todo App v2.0

A clean, minimal todo application built with Node.js, SQLite, and vanilla JavaScript. Features drag-and-drop reordering, offline support, and responsive design.

## 🚀 Features

- **User Authentication**: Secure login/registration with JWT tokens
- **Todo Management**: Create, edit, delete, and toggle todos
- **Drag & Drop**: Reorder todos with mouse (desktop) or touch (mobile)
- **Filtering**: View all, active, done, or separated todos
- **Offline Support**: Works offline with service worker caching
- **Responsive Design**: Optimized for desktop and mobile devices
- **Real-time Updates**: Instant UI updates with server synchronization

## 📁 Project Structure

```
minimal-todo/
├── src/
│   ├── backend/
│   │   ├── server.js          # Main Express server
│   │   └── routes/
│   │       ├── auth.js        # Authentication routes
│   │       └── todos.js       # Todo CRUD routes
│   ├── frontend/              # (Future: React components)
│   └── shared/                # (Future: Shared utilities)
├── public/
│   ├── css/
│   │   └── styles.css         # Main stylesheet
│   ├── js/
│   │   ├── app.js            # Main application logic
│   │   ├── api.js            # API utility functions
│   │   ├── components.js     # UI components
│   │   └── drag-handler.js   # Drag & drop functionality
│   ├── index.html            # Main HTML file
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker
├── config/
│   └── default.json          # Default configuration
├── package.json
├── env.example               # Environment variables template
└── README.md
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd minimal-todo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🚀 Quick Start

1. **Register a new account** or use existing credentials
2. **Add todos** by typing in the input field and pressing Enter
3. **Reorder todos** by dragging the ↕ icon (desktop) or long-pressing and dragging (mobile)
4. **Toggle completion** by clicking the checkbox
5. **Edit todos** by double-clicking on the text
6. **Filter todos** using the filter buttons (All, Active, Done, Separate)

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `env.example`:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
DATABASE_PATH=data.db
FRONTEND_URL=http://localhost:3000
```

### Database

The app uses SQLite with the following schema:

- **accounts**: User authentication data
- **todo_items**: Todo items with ordering and metadata

## 📱 Mobile Support

- **Touch Drag**: Long press (500ms) on the ↕ icon, then drag to reorder
- **Responsive Design**: Optimized layouts for mobile screens
- **PWA Support**: Installable as a Progressive Web App

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt for password security
- **CORS Protection**: Configurable cross-origin resource sharing
- **Input Validation**: Server-side validation for all inputs

## 🎨 Customization

### Styling
Edit `public/css/styles.css` to customize the appearance:

- Color scheme
- Typography
- Layout spacing
- Responsive breakpoints

### Functionality
Modify the JavaScript modules:

- `public/js/app.js`: Main application logic
- `public/js/components.js`: UI components
- `public/js/drag-handler.js`: Drag & drop behavior
- `public/js/api.js`: API communication

## 🗄️ Database Admin Interface

The project includes a web-based database admin interface for viewing and querying the production database.

**Access:** https://admin.todo.florianbolli.ch

### Deploy Database Admin

```bash
./deploy-db-admin.sh
```

See [DB-ADMIN-DEPLOYMENT.md](DB-ADMIN-DEPLOYMENT.md) for full setup instructions.

⚠️ **Security Warning:** Always enable authentication before exposing to the internet!

## 🚀 Deployment

### Production Setup

1. **Set production environment variables**
   ```env
   NODE_ENV=production
   JWT_SECRET=your-production-secret-key
   PORT=3000
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Development

### Available Scripts

- `npm start`: Start production server
- `npm run dev`: Start development server with auto-reload
- `npm run build`: No build step required (vanilla JS)
- `npm run clean`: Clean node_modules and package-lock.json
- `npm run setup`: Install dependencies

### Code Organization

- **Backend**: Express.js with modular route handlers
- **Frontend**: Vanilla JavaScript with component-based architecture
- **Database**: SQLite with prepared statements for security
- **Styling**: CSS with modern features and responsive design

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:

1. Check the existing issues
2. Create a new issue with detailed information
3. Include steps to reproduce any bugs

## 🔄 Changelog

### v2.0.0
- Complete project restructure
- Modular architecture
- Improved mobile drag & drop
- Enhanced error handling
- Better code organization

### v1.0.0
- Initial release
- Basic todo functionality
- User authentication
- Drag & drop reordering