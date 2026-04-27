import axios from "axios";

const NOMI_URL = 'https://nominatim.openstreetmap.org/search';

export async function addressgeo(address) {
    try {
        const response = await axios.get(NOMI_URL, {
            params: {
                q: address,
                format:'json',
                addressdetails: 1,
                limit: 1
            },
            headers:{
                'User-Agent': 'gotogether/1.0 (jhonalexandermontes4@gmail.com)'
            }
        });

        if(!response.data || response.data.length === 0){
            return null;
        }

        const place = response.data[0];

        return{
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon),
            display_name: place.display_name
        };

    } catch (error) {
        console.error('error en geocoding', error.menssage);
        throw new Error('no se pudo obtener coordenada')
    }
}

