import { z } from 'zod';

// Validation schemas for cross-app data consistency

export const UserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'general_user']),
  profile: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    businessName: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional()
  }),
  walletBalance: z.number().min(0),
  isActive: z.boolean(),
  permissions: z.object({
    payflow: z.boolean(),
    invoiceflow: z.boolean(),
    stockflow: z.boolean()
  })
});

export const TransactionSchema = z.object({
  payerId: z.string(),
  receiverId: z.string(),
  companyId: z.string().optional(),
  amount: z.number().positive(),
  type: z.enum(['wallet_topup', 'invoice_payment', 'product_purchase', 'transfer']),
  description: z.string().min(1),
  sourceApp: z.enum(['payflow', 'invoiceflow', 'stockflow']),
  metadata: z.record(z.any()).optional()
});

export const InvoiceSchema = z.object({
  companyId: z.string(),
  clientEmail: z.string().email(),
  invoiceNumber: z.string(),
  items: z.array(z.object({
    id: z.string(),
    description: z.string(),
    quantity: z.number().positive(),
    rate: z.number().positive(),
    total: z.number().positive()
  })),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().positive(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  dueDate: z.date()
});

export const OrderSchema = z.object({
  companyId: z.string(),
  customerId: z.string(),
  customerEmail: z.string().email(),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(),
    price: z.number().positive(),
    total: z.number().positive()
  })),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().positive(),
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled'])
});

export const ProductSchema = z.object({
  companyId: z.string(),
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string(),
  price: z.number().positive(),
  quantity: z.number().min(0),
  lowStockThreshold: z.number().min(0),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean()
});

export const CompanySchema = z.object({
  name: z.string().min(1),
  ownerId: z.string(),
  settings: z.object({
    logo: z.string().url().optional(),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    address: z.string(),
    phone: z.string(),
    email: z.string().email(),
    vatNumber: z.string().optional()
  }),
  integrations: z.object({
    payflow: z.object({
      enabled: z.boolean(),
      merchantId: z.string()
    }),
    invoiceflow: z.object({
      enabled: z.boolean()
    }),
    stockflow: z.object({
      enabled: z.boolean()
    })
  })
});

/**
 * Validation middleware for API endpoints
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'Invalid request data'
      });
    }
  };
};

/**
 * Business logic validation
 */
export class BusinessValidation {
  static validatePaymentAmount(amount: number): { valid: boolean; error?: string } {
    if (amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }
    
    if (amount > 100000) { // 100,000 SZL limit
      return { valid: false, error: 'Amount exceeds maximum limit of 100,000 SZL' };
    }
    
    return { valid: true };
  }

  static validateInvoicePayment(invoice: Invoice, payerId: string): { valid: boolean; error?: string } {
    if (invoice.status === 'paid') {
      return { valid: false, error: 'Invoice is already paid' };
    }
    
    if (invoice.status === 'cancelled') {
      return { valid: false, error: 'Invoice has been cancelled' };
    }
    
    if (new Date() > invoice.dueDate) {
      return { valid: false, error: 'Invoice is overdue' };
    }
    
    return { valid: true };
  }

  static validateOrderPayment(order: Order, payerId: string): { valid: boolean; error?: string } {
    if (order.status === 'paid') {
      return { valid: false, error: 'Order is already paid' };
    }
    
    if (order.status === 'cancelled') {
      return { valid: false, error: 'Order has been cancelled' };
    }
    
    if (order.customerId !== payerId) {
      return { valid: false, error: 'You can only pay for your own orders' };
    }
    
    return { valid: true };
  }

  static validateStockAvailability(products: Product[], orderItems: Array<{ productId: string; quantity: number }>): { valid: boolean; error?: string } {
    for (const item of orderItems) {
      const product = products.find(p => p.id === item.productId);
      
      if (!product) {
        return { valid: false, error: `Product ${item.productId} not found` };
      }
      
      if (!product.isActive) {
        return { valid: false, error: `Product ${product.name} is not available` };
      }
      
      if (product.quantity < item.quantity) {
        return { valid: false, error: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}` };
      }
    }
    
    return { valid: true };
  }
}