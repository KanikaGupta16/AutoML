import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const sampleData = [
  {
    id: 1,
    product: "Wireless Headphones",
    price: "$129.99",
    rating: "4.5",
    reviews: "2,847",
  },
  {
    id: 2,
    product: "Smart Watch Pro",
    price: "$299.00",
    rating: "4.7",
    reviews: "1,293",
  },
  {
    id: 3,
    product: "USB-C Hub 7-in-1",
    price: "$49.99",
    rating: "4.3",
    reviews: "892",
  },
  {
    id: 4,
    product: "Mechanical Keyboard",
    price: "$159.00",
    rating: "4.8",
    reviews: "3,421",
  },
  {
    id: 5,
    product: "4K Webcam",
    price: "$89.99",
    rating: "4.2",
    reviews: "567",
  },
];

export function DataPreview() {
  return (
    <div className="h-full flex flex-col bg-card rounded-lg overflow-hidden border border-border/50">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-card-foreground text-sm">Data Preview</h3>
          <p className="text-xs text-muted-foreground">
            Harvesting data from 8 sources...
          </p>
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-info border-t-transparent rounded-full"
        />
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="text-xs">Product</TableHead>
              <TableHead className="text-xs">Price</TableHead>
              <TableHead className="text-xs">Rating</TableHead>
              <TableHead className="text-xs">Reviews</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleData.map((row, index) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, backgroundColor: "rgba(34, 197, 94, 0.2)" }}
                animate={{ opacity: 1, backgroundColor: "transparent" }}
                transition={{ delay: index * 0.5 + 2, duration: 0.5 }}
                className="border-border/30"
              >
                <TableCell className="text-xs font-medium">{row.product}</TableCell>
                <TableCell className="text-xs text-success">{row.price}</TableCell>
                <TableCell className="text-xs">{row.rating}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.reviews}</TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Showing 5 of 14,203 records
          </span>
          <span className="text-info font-medium">+847 new</span>
        </div>
      </div>
    </div>
  );
}
