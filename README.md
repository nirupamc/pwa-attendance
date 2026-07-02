# TanTrack - PWA Attendance Management System

A modern, secure **Progressive Web App (PWA)** for employee attendance management with QR code verification, geofencing, device fingerprinting, and role-based access control.

<img width="403" height="859" alt="image" src="https://github.com/user-attachments/assets/d6a8d430-f63f-436d-ad2c-13b10a4b4ef8" />
<img width="396" height="846" alt="image" src="https://github.com/user-attachments/assets/08dc6f0f-bf59-4a44-b632-94ccf48dfd12" />
<img width="395" height="859" alt="image" src="https://github.com/user-attachments/assets/c8167ace-de27-4be9-817a-9797e79c2b53" />
<img width="398" height="850" alt="image" src="https://github.com/user-attachments/assets/cd844604-8b40-4b97-a692-89dd92a194a5" />



🚀 **Live Demo**: [pwa-attendance-lac.vercel.app](https://pwa-attendance-lac.vercel.app)

## ✨ Features

### 🔐 Security & Authentication
- **Device Fingerprinting**: Unique device identification using FingerprintJS
- **Device Registration & Binding**: Secure device enrollment with token hashing
- **Role-Based Access Control**: Admin and Employee roles with distinct functionalities
- **Password Management**: Mandatory password change on first login
- **Device Security Events**: Track and monitor suspicious activities
- **Secure Authentication**: Supabase SSR integration for secure server-side auth

### 📍 Attendance Tracking
- **QR Code Verification**: Scan office QR codes for attendance punch-in/out
- **Geofencing**: GPS-based location verification with configurable radius
- **WiFi Network Detection**: BSSID scanning to verify office network presence
- **IP Address Logging**: Track IP addresses for attendance records
- **Real-time Location Capture**: Automatic GPS location timestamp recording

### 📱 Progressive Web App
- **Installable**: Add to home screen on any device
- **Offline Support**: Works offline with smart caching strategies
- **Push Notifications**: Web push notifications for attendance alerts
- **Responsive Design**: Fully responsive UI optimized for mobile and desktop
- **Service Worker**: Intelligent caching for Supabase API calls and assets

### 👔 Admin Dashboard
- **Employee Management**: View and manage employee profiles
- **Attendance Analytics**: Track attendance records and generate reports
- **Leave Management**: Approve/reject employee leave requests
- **Office Configuration**: Manage office networks, IP whitelist, and geofence settings
- **Device Management**: Monitor and revoke employee devices
- **QR Code Generation**: Create and manage office attendance QR codes

### 💼 Employee Portal
- **Attendance Status**: Real-time punch-in/out functionality
- **Leave Requests**: Submit and track leave requests (Sick, Casual, Paid)
- **Attendance History**: View detailed attendance records
- **Device Management**: View registered device info and security status
- **Profile Management**: Update personal information and password

## 🛠️ Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework with animations
- **Radix UI**: Accessible component primitives
- **React Hook Form**: Form state management with Zod validation
- **GSAP**: Advanced animations and UI transitions
- **Leaflet & React-Leaflet**: Interactive maps for geofencing visualization

### Scanning & QR Codes
- **@zxing/library**: QR code decoding and barcode scanning
- **qr-scanner**: QR code scanning from camera
- **qrcode.react**: QR code generation for React

### Backend & Database
- **Supabase**: PostgreSQL database with real-time capabilities
- **Supabase Auth**: Row-Level Security (RLS) for database protection
- **Supabase SSR**: Server-side rendering authentication

### Security & Device
- **@fingerprintjs/fingerprintjs**: Device fingerprinting
- **web-push**: Web Push Notifications API integration
- **jsqr**: Lightweight QR code detection

### State Management & Utilities
- **Zustand**: Lightweight state management
- **Zod**: Runtime type validation
- **Blurhash**: Image placeholder generation
- **Sonner**: Toast notifications
- **class-variance-authority**: Component variant management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Git
- Supabase account (free tier available)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/nirupamc/pwa-attendance.git
cd pwa-attendance
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_PWA_ENABLED=true
```

4. **Seed initial users** (optional)
```bash
npm run seed
```

This creates sample employee and admin accounts for testing.

5. **Run development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with sample users

## 📁 Project Structure

```
pwa-attendance/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages (login, signup)
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── admin/             # Admin dashboard
│   ├── home/              # Employee home
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # Reusable React components
│   ├── ui/                # UI primitives (buttons, inputs, etc.)
│   ├── layout/            # Layout components
│   └── features/          # Feature-specific components
├── lib/                   # Utility functions and types
│   ├── supabase/          # Supabase client setup
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Helper utilities
│   ├── types/             # TypeScript type definitions
│   └── animations/        # GSAP animation utilities
├── public/                # Static assets
│   ├── icons/             # PWA icons
│   └── manifest.json      # PWA manifest
├── worker/                # Service Worker customizations
├── styles/                # Global styles and CSS
└── scripts/               # Utility scripts (seeding, etc.)
```

## 🔑 Key Features Explained

### Device Fingerprinting & Security
Every attendance record is tied to a registered device. The system uses:
- Browser fingerprinting for device identification
- Token hashing for secure device tracking
- Device status management (active/pending/revoked)

### Geofencing
Attendance records can require:
- GPS location to be within a configured radius of office
- Connection to specific office WiFi networks
- Valid office IP addresses

### Role-Based System
- **Admins**: Full access to configuration, employee management, and analytics
- **Employees**: Limited access to own attendance, leave requests, and profile

## 🌐 PWA Configuration

The app is configured as a PWA with:
- **Offline Support**: Service Worker caches critical assets
- **Install Prompt**: Users can install on home screen
- **Push Notifications**: Real-time notification support
- **Smart Caching**: Supabase API responses cached with NetworkFirst strategy

View PWA configuration in `next.config.js`.

## 🗄️ Database Schema

Key tables in Supabase:
- **employees**: User profiles and device registration
- **attendance**: Punch-in/out records with location data
- **office_config**: Office geofence and network settings
- **office_networks**: Registered office WiFi networks
- **office_qr_codes**: Active QR codes for attendance
- **leave_requests**: Employee leave applications
- **device_security_events**: Security audit logs
- **push_subscriptions**: User push notification subscriptions

## 🔒 Authentication Flow

1. User logs in with email/password via Supabase Auth
2. Server validates user and checks device fingerprint
3. First-time users must change password
4. Role-based redirects to appropriate dashboard
5. All data access protected with Row-Level Security (RLS)

## 📱 Mobile & Responsive Design

- Optimized for mobile devices with touch-friendly UI
- Responsive breakpoints for tablets and desktops
- Mobile-first design approach
- PWA can be installed on iOS and Android

## 🚀 Deployment

### Deploy to Vercel (Recommended)

```bash
vercel
```

The app is already configured for Vercel deployment. Set environment variables in Vercel dashboard.

### Deploy to Other Platforms

Ensure Node.js 18+ is available and set environment variables accordingly.

## 📝 Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_PWA_ENABLED` | Enable PWA features (true/false) |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source. Check the repository for license details.

## 📧 Support

For issues, questions, or suggestions, please open an issue on [GitHub](https://github.com/nirupamc/pwa-attendance/issues).

---

**Built with ❤️ by [nirupamc](https://github.com/nirupamc)**
