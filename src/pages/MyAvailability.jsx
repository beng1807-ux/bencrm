import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, X } from 'lucide-react';
import { toast } from 'sonner';

export default function MyAvailability() {
  const [djProfile, setDjProfile] = useState(null);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const user = await base44.auth.me();
      // חיפוש DJ לפי user_id (ID או אימייל)
      let djList = await base44.entities.DJ.filter({ user_id: user.id });
      if (djList.length === 0 && user.email) {
        djList = await base44.entities.DJ.filter({ user_id: user.email });
      }
      if (djList.length === 0 && user.email) {
        djList = await base44.entities.DJ.filter({ email: user.email });
      }
      if (djList.length > 0) {
        setDjProfile(djList[0]);
        const dates = (djList[0].unavailable_dates || []).sort();
        setUnavailableDates(dates);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      toast.error('שגיאה בטעינת זמינות');
    } finally {
      setLoading(false);
    }
  };

  const addUnavailableDate = async () => {
    if (!newDate) return;

    // Validate past date
    const today = new Date().toISOString().split('T')[0];
    if (newDate < today) {
      toast.error('לא ניתן להוסיף תאריך שכבר עבר');
      return;
    }

    // Validate duplicate
    if (unavailableDates.includes(newDate)) {
      toast.error('התאריך כבר חסום');
      return;
    }
    
    try {
      const updatedDates = [...unavailableDates, newDate].sort();
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-8 h-8" />
          הזמינות שלי
        </h1>
        <p className="text-gray-600">ניהול תאריכים לא זמינים</p>
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
              {unavailableDates.map(date => (
                <div key={date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">{date}</span>
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