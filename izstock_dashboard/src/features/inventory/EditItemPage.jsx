// src/features/inventory/EditItemPage.jsx
import { Alert, Button, Card, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { updateItem } from '../../api/items';
import ItemForm from './ItemForm';
import { useItem } from './useItem';
import { useStoreLocations } from './useStoreLocations';
import MoveLocationCard from './MoveLocationCard';

function describeLocation(aisles, item) {
    for (const a of aisles) {
        const shelf = a.shelves.find((s) => s.id === item.shelfId);
        if (shelf) return `${a.label} · ${shelf.label} shelf`;
    }
    return item.aisleNumber ? `Aisle ${item.aisleNumber}` : 'Not on the current map';
}

export default function EditItemPage() {
    const { sku } = useParams(); // already decoded by the router
    const navigate = useNavigate();
    const { status, item, error, reload } = useItem(sku);
    const locations = useStoreLocations();

    let body;
    if (status === 'loading') {
        body = <div className="text-center py-5"><Spinner animation="border" role="status" aria-label="Loading item" /></div>;
    } else if (status === 'notfound') {
        body = (
        <Alert variant="warning" className="mb-0">
            No item with SKU <strong className="font-monospace">{sku}</strong> exists. It may have been deleted.
            <div className="mt-2"><Button size="sm" onClick={() => navigate('/')}>Back to inventory</Button></div>
        </Alert>
        );
    } else if (status === 'error') {
    body = (
        <Alert variant="danger" className="d-flex align-items-center mb-0">
            <span className="me-auto">Couldn't load this item: {error.message}</span>
            <Button size="sm" variant="outline-danger" onClick={reload}>Retry</Button>
        </Alert>
        );
    } else {
        body = (
            <>
                <ItemForm
                mode="edit"
                initial={item}
                locationLabel={describeLocation(locations.aisles, item)}
                onSubmit={(patch) => updateItem(item.sku, patch)}
                onDone={() => navigate('/')}
                onCancel={() => navigate('/')}
                />
            </>
        );
    }

    return (
        <div className="container py-4" style={{ maxWidth: 720 }}>
            <Card>
                <Card.Header><h1 className="h5 mb-0">Edit item</h1></Card.Header>
                <Card.Body>{body}</Card.Body>
            </Card>
            {status === 'ready' && (
                <MoveLocationCard item={item} locations={locations} onMoved={reload} />
            )}
        </div>
    );
}