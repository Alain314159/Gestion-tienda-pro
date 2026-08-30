<script>
  import {
    Home, ShoppingCart, ShoppingBag, Package, Tag, DollarSign, Wallet,
    BarChart3, TrendingUp, Calendar, Settings, Moon, Sun, Search, Plus, X,
    Pencil, Trash2, Lock, Download, Upload, RefreshCw, LayoutGrid,
    AlertTriangle, Check, ChevronDown, Shield, Gem, Store, Minus,
    AlertCircle, Eye, EyeOff, Printer, Share2, FileText, LogOut,
    User, Users, Calculator, Percent, Box, Layers, ClipboardList,
    ArrowUp, ArrowDown, Bell, Info, HelpCircle, Save, XCircle,
    Menu, MoreVertical, Filter, ArrowUpDown, Clock, History,
    Zap, Star, Heart, Mail, Phone, MapPin, CreditCard, Banknote,
    Coins, Receipt, ScanLine, Barcode, Camera, Image, FileJson,
    FileSpreadsheet, FileUp, FileDown, DatabaseBackup, RotateCcw,
    RefreshCcw, Wifi, WifiOff, Battery, BatteryCharging, Smartphone,
    Tablet, Laptop, Monitor, MousePointerClick, Keyboard, Fingerprint,
    Key, Unlock, KeyRound, Brain, Lightbulb, Scale, PenTool,
    StickyNote, Mic, MessageCircle, Send, Compass, Target,
    BookOpen, School, Swords, Clover, Rocket, Plane, Car, Truck,
    Bike, TrainFront, Ship, Anchor, Atom, Infinity, Sparkles,
    Hammer, Building, Building2, Factory, Warehouse, Paintbrush,
    PaintBucket, Palette, Rainbow, Scissors, Link, LogIn, Crown,
    Circle, Square, Triangle, Hexagon, Octagon, Pentagon, HeartPulse
  } from 'lucide-svelte';

  let { nombre, size = 20, color = 'currentColor', class: className = '' } = $props();

  const map = {
    home: Home, cart: ShoppingCart, bag: ShoppingBag, package: Package,
    tag: Tag, dollar: DollarSign, wallet: Wallet, chart: BarChart3,
    trend: TrendingUp, calendar: Calendar, settings: Settings,
    moon: Moon, sun: Sun, search: Search, plus: Plus, x: X,
    edit: Pencil, trash: Trash2, lock: Lock, download: Download,
    upload: Upload, refresh: RefreshCw, grid: LayoutGrid,
    alert: AlertTriangle, check: Check, chevron: ChevronDown,
    shield: Shield, diamond: Gem, store: Store, minus: Minus,
    alertCircle: AlertCircle, eye: Eye, eyeOff: EyeOff,
    printer: Printer, share2: Share2, fileText: FileText,
    logOut: LogOut, user: User, users: Users, calculator: Calculator,
    percent: Percent, box: Box, layers: Layers, clipboard: ClipboardList,
    arrowUp: ArrowUp, arrowDown: ArrowDown, bell: Bell, info: Info,
    help: HelpCircle, save: Save, cancel: XCircle, menu: Menu,
    more: MoreVertical, filter: Filter, sort: ArrowUpDown,
    clock: Clock, history: History, zap: Zap, star: Star,
    heart: Heart, mail: Mail, phone: Phone, mapPin: MapPin,
    creditCard: CreditCard, banknote: Banknote, coins: Coins,
    receipt: Receipt, scan: ScanLine, barcode: Barcode,
    camera: Camera, image: Image, fileJson: FileJson,
    fileSpreadsheet: FileSpreadsheet, export: FileUp, import: FileDown,
    backup: DatabaseBackup, restore: RotateCcw, sync: RefreshCcw,
    wifi: Wifi, wifiOff: WifiOff, battery: Battery,
    batteryCharging: BatteryCharging, smartphone: Smartphone,
    tablet: Tablet, laptop: Laptop, monitor: Monitor,
    mouse: MousePointerClick, keyboard: Keyboard,
    fingerprint: Fingerprint, key: Key, unlock: Unlock,
    password: KeyRound, brain: Brain, idea: Lightbulb,
    scale: Scale, pen: PenTool, note: StickyNote, mic: Mic,
    message: MessageCircle, send: Send, compass: Compass,
    target: Target, book: BookOpen, school: School, sword: Swords,
    clover: Clover, rocket: Rocket, plane: Plane, car: Car,
    truck: Truck, bike: Bike, train: TrainFront, ship: Ship,
    anchor: Anchor, atom: Atom, infinity: Infinity, sparkles: Sparkles,
    hammer: Hammer, building: Building, building2: Building2,
    factory: Factory, warehouse: Warehouse, brush: Paintbrush,
    paint: PaintBucket, palette: Palette, rainbow: Rainbow,
    scissors: Scissors, link: Link, logIn: LogIn, crown: Crown,
    circle: Circle, square: Square, triangle: Triangle,
    hexagon: Hexagon, octagon: Octagon, pentagon: Pentagon,
    heartPulse: HeartPulse
  };

  const Component = map[nombre] || AlertCircle;
</script>

<Component {size} {color} class={className} />
