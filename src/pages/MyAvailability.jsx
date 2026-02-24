import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, X } from 'lucide-react';
import { toast } from 'sonner';

export default function MyAvailability() {
  const [djProfile, setDjProfile] = useState(null);
  const [allDJs, setAllDJs] = useState([]);
  const [selectedDJId, setSelectedDJId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    try {
      const user = await base44.auth.me();
      const admin = user.role === 'admin';
      setIsAdmin(admin);

      if (admin) {
        const djs = await base44.entities.DJ.list();
        setAllDJs(djs);
        if (djs.length > 0) {
          setSelectedDJId(djs[0].id);
          setDjProfile(djs[0]);
          setUnavailableDates(djs[0].unavailable_dates || []);
        }
      } else {
        const djList = await base44.entities.DJ.filter({ user_id: user.id });
        if (djList.length > 0) {
          setDjProfile(djList[0]);
          setUnavailableDates(djList[0].unavailable_dates || []);
        }
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      toast.error('שגיאה בטעינת זמינות');
    } finally {
      setLoading(false);
    }
  };

  const selectDJ = (djId) => {
    const dj = allDJs.find(d => d.id === djId);
    if (dj) {
      setSelectedDJId(djId);
      setDjProfile(dj);
      setUnavailableDates(dj.unavailable_dates || []);
    }
  };

  const addUnavailableDate = async () => {
    if (!newDate) return;
    
    try {
      const updatedDates = [...unavailableDates, newDate];
      await base44.entities.DJ.update(djProfile.id, {
        unavailable_dates: updatedDates
      });
      setUnavailableDates(updatedDates);
      setNewDate('');
      toast.success('התאריך נוסף');
    } catch (error) {
      console.error('Error adding date:', error);
      toast.error('שגיאה בהוספת תאריך');
    }
  };

  const removeUnavailableDate = async (dateToRemove) => {
    try {
      const updatedDates = unavailableDates.filter(d => d !== dateToRemove);
      await base44.entities.DJ.update(djProfile.id, {
        unavailable_dates: updatedDates
      });
      setUnavailableDates(updatedDates);
      toast.success('התאריך הוסר');
    } catch (error) {
      console.error('Error removing date:', error);
      toast.error('שגיאה בהסרת תאריך');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-8 h-8" />
            {isAdmin ? 'זמינות תקליטנים' : 'הזמינות שלי'}
          </h1>
          <p className="text-gray-600">ניהול תאריכים לא זמינים{djProfile ? ` — ${djProfile.name}` : ''}</p>
        </div>
        {isAdmin && allDJs.length > 0 && (
          <Select value={selectedDJId} onValueChange={selectDJ}>
            <SelectTrigger className="w-52 bg-white">
              <SelectValue placeholder="בחר תקליטן" />
            </SelectTrigger>
            <SelectContent>
              {allDJs.map(dj => (
                <SelectItem key={dj.id} value={dj.id}>{dj.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>הוספת תאריך לא זמין</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addUnavailableDate} className="bg-orange-500 hover:bg-orange-600">
              הוסף תאריך
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>תאריכים לא זמינים ({unavailableDates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {unavailableDates.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {unavailableDates.sort().map(date => (
                <div key={date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">
                    {new Date(date).toLocaleDateString('he-IL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUnavailableDate(date)}
                    className="h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">אין תאריכים לא זמינים</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}