import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, DollarSign, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeEvents: 0,
    pendingPayments: 0,
    thisMonthRevenue: 0,
    newLeads: 0,
    upcomingEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [leads, events] = await Promise.all([
        base44.entities.Lead.list(),
        base44.entities.Event.list(),
      ]);

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const newLeads = leads.filter(l => l.status === 'NEW').length;
      const activeEvents = events.filter(e => 
        e.event_status !== 'COMPLETED' && e.event_status !== 'CANCELLED'
      ).length;
      const pendingPayments = events.filter(e => 
        e.payment_status !== 'PAID_FULL'
      ).length;
      
      const thisMonthEvents = events.filter(e => {
        const eventDate = new Date(e.event_date);
        return eventDate >= thisMonthStart && e.payment_status === 'PAID_FULL';
      });
      const thisMonthRevenue = thisMonthEvents.reduce((sum, e) => sum + (e.price_total || 0), 0);

      const upcomingEvents = events.filter(e => {
        const eventDate = new Date(e.event_date);
        return eventDate >= now && eventDate <= nextWeek;
      }).length;

      setStats({
        totalLeads: leads.length,
        activeEvents,
        pendingPayments,
        thisMonthRevenue,
        newLeads,
        upcomingEvents,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'לידים חדשים',
      value: stats.newLeads,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'אירועים פעילים',
      value: stats.activeEvents,
      icon: Calendar,
      color: 'bg-green-500',
    },
    {
      title: 'ממתינים לתשלום',
      value: stats.pendingPayments,
      icon: AlertCircle,
      color: 'bg-orange-500',
    },
    {
      title: 'הכנסות חודש זה',
      value: `₪${stats.thisMonthRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">דשבורד</h1>
        <p className="text-gray-600">סקירה כללית של המערכת</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              אירועים קרובים (7 הימים הקרובים)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center py-8">
              {stats.upcomingEvents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              סך כל לידים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center py-8">
              {stats.totalLeads}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}