import "./ProductList.css";

// Sample product data
const products = [
  { id: 1, name: '고랭지 배추 1포기', price: '8,000원', location: '강원 평창군' },
  { id: 2, name: '제주 한라봉 1kg', price: '15,000원', location: '제주 서귀포시' },
  { id: 3, name: '홍천 잣 500g', price: '30,000원', location: '강원 홍천군' },
  { id: 4, name: '유기농 쌀 10kg', price: '45,000원', location: '충남 당진시' },
];

const ProductList = () => {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <div key={product.id} className="product-card">
          <div className="product-image"></div>
          <div className="product-info">
            <h3 className="product-name">{product.name}</h3>
            <p className="product-price">{product.price}</p>
            <p className="product-location">{product.location}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;