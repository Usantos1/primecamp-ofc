import React, { useState, useEffect } from 'react';

// Utility to convert coordinates to address using OpenStreetMap Nominatim API
export const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
  try {
    // Timeout de 5 segundos para não demorar muito
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'PrimeCamp/1.0'
        }
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Failed to fetch address');
    }
    
    const data = await response.json();
    
    if (data && data.display_name) {
      return data.display_name;
    }
    
    // Tentar construir endereço manualmente se display_name não estiver disponível
    if (data && data.address) {
      const addr = data.address;
      const parts = [];
      if (addr.road) parts.push(addr.road);
      if (addr.house_number) parts.push(addr.house_number);
      if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb);
      if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
      if (addr.state) parts.push(addr.state);
      
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
    
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('Address lookup timeout');
    } else {
      console.error('Error getting address:', error);
    }
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

// Component to display location with address lookup
export const LocationDisplay = ({ location }: { location: string | object | null | undefined }) => {
  // Converter location para string se for objeto
  const locationString = React.useMemo(() => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
      // Se for objeto com latitude e longitude
      if ('latitude' in location && 'longitude' in location) {
        return `${location.latitude}, ${location.longitude}`;
      }
      // Tentar converter para string
      return JSON.stringify(location);
    }
    return String(location);
  }, [location]);

  const [address, setAddress] = useState<string>(locationString);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const loadAddress = async () => {
      if (locationString && locationString.includes(',')) {
        const [lat, lng] = locationString.split(',').map(coord => parseFloat(coord.trim()));
        
        if (!isNaN(lat) && !isNaN(lng)) {
          setLoading(true);
          try {
            // Timeout de 5 segundos
            const addr = await Promise.race([
              getAddressFromCoordinates(lat, lng),
              new Promise<string>(resolve => setTimeout(() => resolve(locationString), 5000))
            ]);
            setAddress(addr);
          } catch (error) {
            console.error('Failed to load address:', error);
            setAddress(locationString); // Fallback para coordenadas originais
          } finally {
            setLoading(false);
          }
        } else {
          setAddress(locationString);
        }
      } else {
        setAddress(locationString || 'Localização não disponível');
      }
    };

    loadAddress();
  }, [locationString]);

  if (loading) {
    return <span className="text-muted-foreground">Carregando endereço...</span>;
  }

  return (
    <span className="text-sm" title={locationString}>
      {address.length > 50 ? `${address.substring(0, 50)}...` : address}
    </span>
  );
};

// Hook version for use in components
export const useLocationAddress = (coordinates: string) => {
  const [address, setAddress] = useState<string>(coordinates);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const loadAddress = async () => {
      if (coordinates && coordinates.includes(',')) {
        const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
        
        if (!isNaN(lat) && !isNaN(lng)) {
          setLoading(true);
          try {
            const addr = await getAddressFromCoordinates(lat, lng);
            setAddress(addr);
          } catch (error) {
            console.error('Failed to load address:', error);
          } finally {
            setLoading(false);
          }
        }
      }
    };

    loadAddress();
  }, [coordinates]);

  return { address, loading };
};