import {
    Wallet, Laptop, TrendingUp, Gift, Home, Crown, Clock, GraduationCap, RefreshCcw, Percent, Tag,
    Zap, ShoppingBasket, Utensils, Bus, Fuel, ShoppingBag, Film, Plane, Stethoscope, Package, Megaphone,
    Trophy, Landmark, Car, Umbrella, Repeat, Heart, Music, BookOpen, Coffee, Dumbbell, PawPrint,
    Gamepad2, Smartphone, Monitor, Wrench, Scissors, Baby, Briefcase, DollarSign, PiggyBank,
    CreditCard, LayoutGrid, CircleDollarSign, Coins, Globe, Anchor, Camera, Gamepad, Ghost,
    Headphones, Image, Key, LifeBuoy, Map, Mic, Moon, Sun, Star, Watch, Wifi
} from 'lucide-react';

export const ICON_MAP: Record<string, any> = {
    'Home': Home,
    'Utensils': Utensils,
    'Car': Car,
    'ShoppingBag': ShoppingBag,
    'Film': Film,
    'Stethoscope': Stethoscope,
    'Zap': Zap,
    'Plane': Plane,
    'GraduationCap': GraduationCap,
    'Scissors': Scissors,
    'PawPrint': PawPrint,
    'Smartphone': Smartphone,
    'Wallet': Wallet,
    'Laptop': Laptop,
    'TrendingUp': TrendingUp,
    'Gift': Gift,
    'Coffee': Coffee,
    'Dumbbell': Dumbbell,
    'Music': Music,
    'BookOpen': BookOpen,
    'Briefcase': Briefcase,
    'DollarSign': DollarSign,
    'PiggyBank': PiggyBank,
    'CreditCard': CreditCard,
    'LayoutGrid': LayoutGrid,
    'ShoppingBasket': ShoppingBasket,
    'Bus': Bus,
    'Fuel': Fuel,
    'Package': Package,
    'Landmark': Landmark,
    'Heart': Heart,
    'Gamepad2': Gamepad2,
    'Baby': Baby,
    'Wifi': Wifi,
    'Star': Star,
    'Globe': Globe,
    'Camera': Camera
};

export const getIconComponent = (key: string) => {
    return ICON_MAP[key] || Tag; // Fallback to Tag icon
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);
