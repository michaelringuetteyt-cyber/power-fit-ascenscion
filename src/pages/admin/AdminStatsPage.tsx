import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Users,
  Activity
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";

interface Booking {
  id: string;
  date: string;
  appointment_type: string;
  status: string;
  created_at: string;
}

interface Invoice {
  id: string;
  amount: number;
  invoice_date: string;
  status: string;
}

interface Purchase {
  id: string;
  amount: number;
  purchase_date: string;
  item_name: string;
  payment_status: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const AdminStatsPage = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("12"); // months

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const startDate = format(subMonths(new Date(), 12), "yyyy-MM-dd");
    
    const [bookingsRes, invoicesRes, purchasesRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, date, appointment_type, status, created_at")
        .gte("date", startDate)
        .order("date", { ascending: true }),
      supabase
        .from("client_invoices")
        .select("id, amount, invoice_date, status")
        .gte("invoice_date", startDate)
        .order("invoice_date", { ascending: true }),
      supabase
        .from("purchases")
        .select("id, amount, purchase_date, item_name, payment_status")
        .gte("purchase_date", startDate)
        .order("purchase_date", { ascending: true }),
    ]);

    if (bookingsRes.data) setBookings(bookingsRes.data);
    if (invoicesRes.data) setInvoices(invoicesRes.data);
    if (purchasesRes.data) setPurchases(purchasesRes.data);
    setLoading(false);
  };

  // Monthly revenue data
  const monthlyRevenueData = useMemo(() => {
    const months = parseInt(selectedPeriod);
    const data: { month: string; revenus: number; factures: number }[] = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthLabel = format(date, "MMM yyyy", { locale: fr });
      
      // Sum invoices for this month (only paid)
      const invoiceTotal = invoices
        .filter(inv => {
          const invDate = parseISO(inv.invoice_date);
          return invDate >= monthStart && invDate <= monthEnd && inv.status === "paid";
        })
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
      
      // Sum purchases for this month (only completed)
      const purchaseTotal = purchases
        .filter(p => {
          const pDate = parseISO(p.purchase_date);
          return pDate >= monthStart && pDate <= monthEnd && p.payment_status === "completed";
        })
        .reduce((sum, p) => sum + Number(p.amount), 0);
      
      data.push({
        month: monthLabel,
        revenus: purchaseTotal,
        factures: invoiceTotal,
      });
    }
    
    return data;
  }, [invoices, purchases, selectedPeriod]);

  // Bookings trend data
  const bookingsTrendData = useMemo(() => {
    const months = parseInt(selectedPeriod);
    const data: { month: string; reservations: number; confirmees: number }[] = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthLabel = format(date, "MMM yyyy", { locale: fr });
      
      const monthBookings = bookings.filter(b => {
        const bDate = parseISO(b.date);
        return bDate >= monthStart && bDate <= monthEnd;
      });
      
      const confirmed = monthBookings.filter(b => b.status === "confirmed").length;
      
      data.push({
        month: monthLabel,
        reservations: monthBookings.length,
        confirmees: confirmed,
      });
    }
    
    return data;
  }, [bookings, selectedPeriod]);

  // Appointment types popularity
  const appointmentTypeData = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    
    bookings.forEach(booking => {
      const type = booking.appointment_type || "Autre";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    return Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bookings]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    
    // Current month revenue
    const currentMonthRevenue = purchases
      .filter(p => {
        const pDate = parseISO(p.purchase_date);
        return pDate >= currentMonthStart && pDate <= currentMonthEnd && p.payment_status === "completed";
      })
      .reduce((sum, p) => sum + Number(p.amount), 0) +
      invoices
        .filter(inv => {
          const invDate = parseISO(inv.invoice_date);
          return invDate >= currentMonthStart && invDate <= currentMonthEnd && inv.status === "paid";
        })
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
    
    // Last month revenue
    const lastMonthRevenue = purchases
      .filter(p => {
        const pDate = parseISO(p.purchase_date);
        return pDate >= lastMonthStart && pDate <= lastMonthEnd && p.payment_status === "completed";
      })
      .reduce((sum, p) => sum + Number(p.amount), 0) +
      invoices
        .filter(inv => {
          const invDate = parseISO(inv.invoice_date);
          return invDate >= lastMonthStart && invDate <= lastMonthEnd && inv.status === "paid";
        })
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
    
    // Current month bookings
    const currentMonthBookings = bookings.filter(b => {
      const bDate = parseISO(b.date);
      return bDate >= currentMonthStart && bDate <= currentMonthEnd;
    }).length;
    
    // Last month bookings
    const lastMonthBookings = bookings.filter(b => {
      const bDate = parseISO(b.date);
      return bDate >= lastMonthStart && bDate <= lastMonthEnd;
    }).length;
    
    const revenueChange = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : "0";
    
    const bookingsChange = lastMonthBookings > 0
      ? ((currentMonthBookings - lastMonthBookings) / lastMonthBookings * 100).toFixed(1)
      : "0";
    
    return {
      currentMonthRevenue,
      lastMonthRevenue,
      revenueChange,
      currentMonthBookings,
      lastMonthBookings,
      bookingsChange,
      totalBookings: bookings.length,
      totalRevenue: purchases
        .filter(p => p.payment_status === "completed")
        .reduce((sum, p) => sum + Number(p.amount), 0) +
        invoices
          .filter(inv => inv.status === "paid")
          .reduce((sum, inv) => sum + Number(inv.amount), 0),
    };
  }, [bookings, invoices, purchases]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl mb-1">Statistiques</h1>
            <p className="text-muted-foreground">Analysez la performance de votre activité</p>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 derniers mois</SelectItem>
              <SelectItem value="6">6 derniers mois</SelectItem>
              <SelectItem value="12">12 derniers mois</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenus ce mois</p>
                  <p className="text-2xl font-display text-gradient">
                    {summaryStats.currentMonthRevenue.toFixed(2)}$
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className={`text-xs mt-2 ${Number(summaryStats.revenueChange) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {Number(summaryStats.revenueChange) >= 0 ? '+' : ''}{summaryStats.revenueChange}% vs mois dernier
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cours ce mois</p>
                  <p className="text-2xl font-display text-gradient">
                    {summaryStats.currentMonthBookings}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className={`text-xs mt-2 ${Number(summaryStats.bookingsChange) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {Number(summaryStats.bookingsChange) >= 0 ? '+' : ''}{summaryStats.bookingsChange}% vs mois dernier
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total cours (période)</p>
                  <p className="text-2xl font-display text-gradient">
                    {summaryStats.totalBookings}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-xs mt-2 text-muted-foreground">
                Sur les {selectedPeriod} derniers mois
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenus totaux</p>
                  <p className="text-2xl font-display text-gradient">
                    {summaryStats.totalRevenue.toFixed(2)}$
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-xs mt-2 text-muted-foreground">
                Sur les {selectedPeriod} derniers mois
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Revenus mensuels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="revenus" name="Achats" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="factures" name="Factures" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bookings Trend */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Progression des cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={bookingsTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="reservations" 
                    name="Total réservations"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="confirmees" 
                    name="Confirmées"
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Appointment Types Popularity */}
          <Card className="bg-card border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Popularité des types de cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={appointmentTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {appointmentTypeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Détail par type</h4>
                  {appointmentTypeData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="text-muted-foreground">{item.value} cours</span>
                    </div>
                  ))}
                  {appointmentTypeData.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      Aucune donnée disponible
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStatsPage;
