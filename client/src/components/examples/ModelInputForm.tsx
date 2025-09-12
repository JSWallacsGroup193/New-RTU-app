import ModelInputForm from '../ModelInputForm';

export default function ModelInputFormExample() {
  const handleSearch = (modelNumber: string) => {
    console.log('Searching for model:', modelNumber);
  };

  return (
    <div className="p-8 bg-background">
      <ModelInputForm onSearch={handleSearch} />
    </div>
  );
}