// src/features/inventory/AddItemPage.jsx
import { useNavigate } from 'react-router-dom';
import { Card } from 'react-bootstrap';
import { createItem } from '../../api/items';
import ItemForm from './ItemForm';
import { useStoreLocations } from './useStoreLocations';

export default function AddItemPage() {
    const navigate = useNavigate();
    const locations = useStoreLocations();

    return (
        <div className="container py-4" style={{ maxWidth: 720 }}>
        <Card>
            <Card.Header><h1 className="h5 mb-0">Add item</h1></Card.Header>
            <Card.Body>
            <ItemForm
                locations={locations}
                onSubmit={createItem}
                onDone={() => navigate('/')}
                onCancel={() => navigate('/')}
            />
            </Card.Body>
        </Card>
        </div>
    );
}