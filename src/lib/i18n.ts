export const dict = {
    en: {
        // Navigation
        dashboard: "Dashboard",
        clients: "Clients",
        claims: "Claims",
        appointments: "Appointments",
        requests: "Requests",
        doctors: "Doctors",
        referral: "Referral",
        settings: "Settings",
        logout: "Log Out",

        // Dashboard Stats
        activeClients: "Active Clients",
        pendingPolicies: "Pending Policies",
        totalClaims: "Total Claims",
        points: "Points",

        // Actions
        newClaim: "New Claim",
        addClient: "+ Add Client",
        viewAll: "View All",
        searchPlaceholder: "Search claims, clients, or doctors...",
        searchPrompt: "Press Cmd+K to search",

        // Dashboard Sections
        recentClaims: "Recent Claims",
        welcome: "Welcome back",
        welcomeDesc: "Here's an overview of your performance today.",

        // Command Palette
        quickSearch: "Quick Search",
        noResults: "No results found.",
        goToAction: "Go to",

        // Login / Register
        loginTitle: "Agent Portal Login",
        loginSub: "Enter your credentials to access your agent dashboard",
        email: "Email Address",
        password: "Password",
        signIn: "Sign In",
        noAccount: "Don't have an account?",
        signUp: "Sign Up",
        registerTitle: "Join as an Agent",
        registerSub: "Create an account to start managing clients and claims",
        fullName: "Full Name",
        createAccount: "Create Account",
        alreadyHaveAccount: "Already have an account?",

        // General
        loading: "Loading...",
    },
    id: {
        // Navigation
        dashboard: "Dasbor",
        clients: "Klien",
        claims: "Klaim",
        appointments: "Jadwal Dokter",
        requests: "Permintaan",
        doctors: "Dokter",
        referral: "Referral",
        settings: "Pengaturan",
        logout: "Keluar",

        // Dashboard Stats
        activeClients: "Klien Aktif",
        pendingPolicies: "Polis Pending",
        totalClaims: "Total Klaim",
        points: "Poin",

        // Actions
        newClaim: "Klaim Baru",
        addClient: "+ Tambah Klien",
        viewAll: "Lihat Semua",
        searchPlaceholder: "Cari klaim, klien, atau dokter...",
        searchPrompt: "Tekan Cmd+K untuk mencari",

        // Dashboard Sections
        recentClaims: "Klaim Terkini",
        welcome: "Selamat datang kembali",
        welcomeDesc: "Berikut adalah ringkasan performa Anda hari ini.",

        // Command Palette
        quickSearch: "Pencarian Cepat",
        noResults: "Tidak ada hasil.",
        goToAction: "Pergi ke",

        // Login / Register
        loginTitle: "Masuk Portal Agen",
        loginSub: "Masukkan kredensial Anda untuk mengakses dasbor agen",
        email: "Alamat Email",
        password: "Kata Sandi",
        signIn: "Masuk",
        noAccount: "Belum punya akun?",
        signUp: "Daftar",
        registerTitle: "Bergabung sebagai Agen",
        registerSub: "Buat akun untuk mulai mengelola klien dan klaim",
        fullName: "Nama Lengkap",
        createAccount: "Buat Akun",
        alreadyHaveAccount: "Sudah punya akun?",

        // General
        loading: "Memuat...",
    }
};

export type Language = 'en' | 'id';
export type Dictionary = typeof dict.en;
