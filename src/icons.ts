import { createElement } from 'lucide';
import {
  Link, Globe, Bookmark, Star, Heart, Home, Folder, File,
  Code, Code2, Terminal, Brain, Cpu, Database, Server, Cloud,
  Music, Video, Image, Camera, Mail, MessageCircle, Phone,
  Map, MapPin, Navigation, ShoppingCart, CreditCard, DollarSign,
  TrendingUp, BarChart, PieChart, Activity, Zap, Newspaper,
  Book, BookOpen, GraduationCap, Pencil, Edit, Wrench, Settings,
  Search, Eye, Lock, Key, Shield, Flag, Tag, Calendar,
  Clock, Timer, Bell, Rss, Wifi, Download, Upload, Share2,
  ExternalLink, Play, Youtube, Github, Twitter, Linkedin,
  Instagram, Slack, Figma, Layers, Layout, Monitor,
  Smartphone, Tablet, Headphones, Mic, Speaker, Sun, Moon,
  CloudRain, Wind, Coffee, Pizza, Car, Plane, Ship, Bike,
  ChevronRight, ChevronDown, Plus, Trash2, Minus, RefreshCw,
  Palette,
} from 'lucide';

type IconNode = readonly (readonly [string, Record<string, string | number>])[];

const ICONS: Record<string, IconNode> = {
  'link': Link, 'globe': Globe, 'bookmark': Bookmark, 'star': Star,
  'heart': Heart, 'home': Home, 'folder': Folder, 'file': File,
  'code': Code, 'code-2': Code2, 'terminal': Terminal, 'brain': Brain,
  'cpu': Cpu, 'database': Database, 'server': Server, 'cloud': Cloud,
  'music': Music, 'video': Video, 'image': Image, 'camera': Camera,
  'mail': Mail, 'message-circle': MessageCircle, 'phone': Phone,
  'map': Map, 'map-pin': MapPin, 'navigation': Navigation,
  'shopping-cart': ShoppingCart, 'credit-card': CreditCard,
  'dollar-sign': DollarSign, 'trending-up': TrendingUp,
  'bar-chart': BarChart, 'pie-chart': PieChart, 'activity': Activity,
  'zap': Zap, 'newspaper': Newspaper, 'book': Book, 'book-open': BookOpen,
  'graduation-cap': GraduationCap, 'pencil': Pencil, 'edit': Edit,
  'tool': Wrench, 'settings': Settings, 'search': Search, 'eye': Eye,
  'lock': Lock, 'key': Key, 'shield': Shield, 'flag': Flag, 'tag': Tag,
  'calendar': Calendar, 'clock': Clock, 'timer': Timer, 'bell': Bell,
  'rss': Rss, 'wifi': Wifi, 'download': Download, 'upload': Upload,
  'share': Share2, 'external-link': ExternalLink, 'play': Play,
  'youtube': Youtube, 'github': Github, 'twitter': Twitter,
  'linkedin': Linkedin, 'instagram': Instagram,
  'slack': Slack, 'figma': Figma, 'layers': Layers, 'layout': Layout,
  'monitor': Monitor, 'smartphone': Smartphone, 'tablet': Tablet,
  'headphones': Headphones, 'mic': Mic, 'speaker': Speaker,
  'sun': Sun, 'moon': Moon, 'cloud-rain': CloudRain, 'wind': Wind,
  'coffee': Coffee, 'pizza': Pizza, 'car': Car, 'plane': Plane,
  'ship': Ship, 'bike': Bike, 'chevron-right': ChevronRight,
  'chevron-down': ChevronDown, 'plus': Plus, 'trash': Trash2,
  'minus': Minus, 'refresh-cw': RefreshCw, 'palette': Palette,
};

export const ICON_NAMES = Object.keys(ICONS).filter(
  k => !['chevron-right', 'chevron-down', 'plus', 'trash', 'minus', 'refresh-cw', 'palette'].includes(k)
);

export function injectIcon(el: HTMLElement, name: string, size = 14): void {
  const data = ICONS[name] ?? ICONS['link']!;
  el.innerHTML = '';
  const svg = createElement(data as any, {
    width: size,
    height: size,
    'stroke-width': 2,
  });
  el.appendChild(svg);
}
