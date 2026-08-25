<script>
  import { Home, ShoppingCart, Package, Wallet, BarChart3, SlidersHorizontal,
    MoreHorizontal, MoreVertical, Plus, Minus, Trash2, Pencil, Archive, X, Check,
    AlertTriangle, Moon, Sun, Download, Upload, Share, Lock, Search, RefreshCw,
    Save, Layers, Clock, Banknote, Tag, Copy } from 'lucide-svelte';
  export let nombre = 'home';
  export let size = 20;
  const P = { home: Home, cart: ShoppingCart, box: Package, wallet: Wallet,
    chart: BarChart3, ajustes: SlidersHorizontal, mas: MoreHorizontal, mas2: MoreVertical,
    plus: Plus, minus: Minus, trash: Trash2, edit: Pencil, archive: Archive, x: X,
    check: Check, alert: AlertTriangle, moon: Moon, sun: Sun, download: Download,
    upload: Upload, share: Share, lock: Lock, search: Search, refresh: RefreshCw,
    save: Save, layers: Layers, clock: Clock, cash: Banknote, tag: Tag, copy: Copy };
</script>
<svelte:component this={P[nombre] || P.home} {size} stroke-width="2" />
